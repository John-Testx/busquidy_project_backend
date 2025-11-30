import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';

// ----------------------------------------------------
// 1. CONFIGURACIÓN INICIAL Y DATOS
// ----------------------------------------------------

// Cargar las credenciales de los usuarios (DEBEN ser de rol 'empresa' y contener 'id_usuario')
const users = new SharedArray('Cuentas de Usuarios', function () {
    // Asegúrese de que users.json incluya 'id_usuario' y sean empresas válidas.
    return JSON.parse(open('./users.json'));
});

// ✅ NUEVO: Cargar las plantillas de proyecto desde project_data.json
const projectTemplates = new SharedArray('Project Data Templates', function () {
    // Este archivo debe ser un ARRAY de objetos { id_usuario: X, projectData: {...} }
    return JSON.parse(open('./project_data.json'));
});


// URL base de su API de Node.js (se mantiene)
const BASE_URL = 'http://localhost:3001/api';

// ----------------------------------------------------
// 2. OBJETIVOS DE RENDIMIENTO (THRESHOLDS) - MÁS EXIGENTES
// ----------------------------------------------------

export const options = {
    stages: [
        // Rampa Agresiva: Subir a 200 usuarios virtuales en 5 minutos (Stress Test)
        { duration: '5m', target: 200 }, 
        
        // Mantener la carga máxima por 3 minutos para estabilizar el punto de quiebre
        { duration: '3m', target: 200 },  
        
        // Rampa de bajada
        { duration: '1m', target: 0 }, 
    ],
    
    // Umbrales Estrictos para Tesis:
    thresholds: {
        // P95 más estricto: 95% de las peticiones debe tardar menos de 350ms
        'http_req_duration': ['p(95)<350'], 
        
        // Tasa de fallos más estricta: menor al 0.5% (buscando inestabilidad)
        'http_req_failed': ['rate<0.005'],   
    },
    
    tags: {
        test_type: 'stress_intensive_write',
    }
};

// ----------------------------------------------------
// 3. FLUJO DE USUARIO VIRTUAL (MAIN FUNCTION) - CREACIÓN INTENSIVA DE PROYECTOS
// ----------------------------------------------------

export default function () {
    // 1. Obtener datos de usuario y plantilla de proyecto
    const vuIndex = __VU % users.length;
    const user = users[vuIndex];
    
    const templateIndex = __VU % projectTemplates.length;
    const projectTemplate = projectTemplates[templateIndex];

    // Clonar la plantilla para modificarla dinámicamente
    let projectBody = JSON.parse(JSON.stringify(projectTemplate));

    // A. Operación Crítica 1: LOGIN (POST)
    let loginRes = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
        email: user.email,
        password: user.password,
    }), {
        headers: { 'Content-Type': 'application/json' },
        tags: { name: 'Login_API' },
    });

    check(loginRes, {
        'Login exitoso (200)': (r) => r.status === 200,
        'Contiene Token JWT': (r) => r.json('token') !== undefined,
    });

    const authToken = loginRes.json('token');
    
    // Pausa
    sleep(1); 

    // B. Operación Crítica 2: CREAR PROYECTO (POST - Operación de Escritura Transaccional)
    if (authToken) {
        
        // === PREPARACIÓN DE DATOS DINÁMICOS ===
        
        // 1. Asignar el ID de usuario. Su controlador lo pide explícitamente.
        // Asumo que users.json ahora contiene el id_usuario
        projectBody.id_usuario = user.id_usuario; 
        
        // 2. Hacer el título único para EVITAR el error de "Proyecto duplicado"
        // que verifica su controlador.
        projectBody.projectData.titulo = projectBody.projectData.titulo.replace('${VU}', __VU);
        
        // === EJECUCIÓN DEL POST ===
        
        const params = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`, 
            },
            tags: { name: 'Create_Project_API' },
        };

        let createRes = http.post(`${BASE_URL}/projects`, JSON.stringify(projectBody), params);
        
        // Verificar la Creación fue exitosa (el controlador devuelve 200 en éxito)
        check(createRes, {
            'Creación OK (200)': (r) => r.status === 200,
            // Chequeamos que los guardianes de límites o duplicados no fallen
            'No es duplicado (no 409)': (r) => r.status !== 409, 
            'No es límite de plan (no 403)': (r) => r.status !== 403, 
        });
    }

    // Pausa más larga después de una operación pesada
    sleep(10); 
}