/**
 * Service Registry - Integração com Consul
 * Registra o serviço no Consul e mantém health checks
 */

const axios = require('axios');

class ServiceRegistry {
  constructor(config) {
    this.serviceName = config.serviceName;
    this.serviceId = `${config.serviceName}-${config.servicePort}-${Date.now()}`;
    this.servicePort = config.servicePort;
    this.consulHost = config.consulHost || 'consul';
    this.consulPort = config.consulPort || 8500;
    this.consulUrl = `http://${this.consulHost}:${this.consulPort}`;
    this.healthCheckInterval = config.healthCheckInterval || 10000; // 10s
    this.registered = false;
  }

  /**
   * Registra o serviço no Consul
   */
  async register() {
    const registration = {
      ID: this.serviceId,
      Name: this.serviceName,
      Address: this.serviceName, // Usa o nome do container como endereço
      Port: this.servicePort,
      Check: {
        HTTP: `http://${this.serviceName}:${this.servicePort}/health`,
        Interval: '10s',
        Timeout: '5s',
        DeregisterCriticalServiceAfter: '30s'
      },
      Tags: ['api', 'nodejs', process.env.NODE_ENV || 'development']
    };

    try {
      await axios.put(
        `${this.consulUrl}/v1/agent/service/register`,
        registration
      );
      this.registered = true;
      console.log(`[Service Registry] Serviço ${this.serviceName} registrado no Consul com ID: ${this.serviceId}`);
      return true;
    } catch (error) {
      console.error(`[Service Registry] Erro ao registrar serviço no Consul:`, error.message);
      return false;
    }
  }

  /**
   * Remove o registro do serviço do Consul
   */
  async deregister() {
    if (!this.registered) {
      return true;
    }

    try {
      await axios.put(
        `${this.consulUrl}/v1/agent/service/deregister/${this.serviceId}`
      );
      this.registered = false;
      console.log(`[Service Registry] Serviço ${this.serviceId} removido do Consul`);
      return true;
    } catch (error) {
      console.error(`[Service Registry] Erro ao remover serviço do Consul:`, error.message);
      return false;
    }
  }

  /**
   * Descobre instâncias de um serviço
   */
  async discoverService(serviceName) {
    try {
      const response = await axios.get(
        `${this.consulUrl}/v1/health/service/${serviceName}?passing=true`
      );
      
      const instances = response.data.map(entry => ({
        id: entry.Service.ID,
        address: entry.Service.Address,
        port: entry.Service.Port,
        tags: entry.Service.Tags,
        url: `http://${entry.Service.Address}:${entry.Service.Port}`
      }));

      console.log(`[Service Registry] Descobertos ${instances.length} instâncias de ${serviceName}`);
      return instances;
    } catch (error) {
      console.error(`[Service Registry] Erro ao descobrir serviço ${serviceName}:`, error.message);
      return [];
    }
  }

  /**
   * Obtém uma instância aleatória de um serviço (load balancing simples)
   */
  async getServiceInstance(serviceName) {
    const instances = await this.discoverService(serviceName);
    
    if (instances.length === 0) {
      throw new Error(`Nenhuma instância saudável de ${serviceName} encontrada`);
    }

    // Load balancing simples: escolhe aleatoriamente
    const randomIndex = Math.floor(Math.random() * instances.length);
    return instances[randomIndex];
  }

  /**
   * Verifica se o Consul está disponível
   */
  async isConsulAvailable() {
    try {
      await axios.get(`${this.consulUrl}/v1/status/leader`, { timeout: 3000 });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Tenta registrar com retry
   */
  async registerWithRetry(maxRetries = 5, delayMs = 5000) {
    for (let i = 0; i < maxRetries; i++) {
      const available = await this.isConsulAvailable();
      
      if (available) {
        const success = await this.register();
        if (success) {
          return true;
        }
      }

      console.log(`[Service Registry] Tentativa ${i + 1}/${maxRetries} falhou. Tentando novamente em ${delayMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }

    console.warn(`[Service Registry] Não foi possível registrar no Consul após ${maxRetries} tentativas. Continuando sem service discovery.`);
    return false;
  }
}

module.exports = ServiceRegistry;
