// services/redisService.js
const redis = require('redis');

class RedisService {
  constructor() {
    this.client = null;
    this.fallbackStore = new Map(); // Fallback a Map
    this.initRedis();
  }

  async initRedis() {
    try {
      const redisConfig = process.env.REDIS_URL 
        ? { url: process.env.REDIS_URL }
        : {
            socket: {
              host: process.env.REDIS_HOST || 'localhost',
              port: process.env.REDIS_PORT || 6379,
              connectTimeout: 2000
            }
          };

      this.client = redis.createClient(redisConfig);
      await this.client.connect();
      console.log('✅ Redis conectado');

      this.client.on('error', (err) => {
        console.warn('⚠️ Redis error:', err.message);
        this.client = null;
      });
    } catch (error) {
      console.warn('⚠️ Redis no disponible, usando Map');
      this.client = null;
    }
  }

  async set(key, value, expirationSeconds = null) {
    try {
      if (this.client?.isOpen) {
        if (expirationSeconds) {
          await this.client.setEx(key, expirationSeconds, value);
        } else {
          await this.client.set(key, value);
        }
      } else {
        // Fallback a Map
        this.fallbackStore.set(key, {
          value,
          expiresAt: expirationSeconds ? Date.now() + (expirationSeconds * 1000) : null
        });
      }
    } catch (error) {
      console.error('Error en Redis set:', error);
      this.fallbackStore.set(key, { value, expiresAt: null });
    }
  }

  async get(key) {
    try {
      if (this.client?.isOpen) {
        return await this.client.get(key);
      } else {
        // Fallback a Map
        const data = this.fallbackStore.get(key);
        if (!data) return null;
        if (data.expiresAt && Date.now() > data.expiresAt) {
          this.fallbackStore.delete(key);
          return null;
        }
        return data.value;
      }
    } catch (error) {
      console.error('Error en Redis get:', error);
      const data = this.fallbackStore.get(key);
      return data?.value || null;
    }
  }

  async delete(key) {
    try {
      if (this.client?.isOpen) {
        await this.client.del(key);
      } else {
        this.fallbackStore.delete(key);
      }
    } catch (error) {
      console.error('Error en Redis delete:', error);
      this.fallbackStore.delete(key);
    }
  }

  async increment(key, expirationSeconds = null) {
    try {
      if (this.client?.isOpen) {
        const value = await this.client.incr(key);
        if (expirationSeconds) {
          await this.client.expire(key, expirationSeconds);
        }
        return value;
      } else {
        const data = this.fallbackStore.get(key);
        const newValue = (data?.value || 0) + 1;
        this.fallbackStore.set(key, {
          value: newValue,
          expiresAt: expirationSeconds ? Date.now() + (expirationSeconds * 1000) : null
        });
        return newValue;
      }
    } catch (error) {
      console.error('Error en Redis increment:', error);
      return 1;
    }
  }
}

// Exportar una instancia única (Singleton)
module.exports = new RedisService();