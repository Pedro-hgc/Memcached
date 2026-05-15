const Memcached = require('memcached')
const dns = require('dns').promises

const MEMCACHED_HOST = process.env.MEMCACHED_URL || 'cache:11211'

async function getMemcachedServers() {                                                                                                                                                          
    const [host, port] = MEMCACHED_HOST.split(':')                                                                                                                                              
                                                                                                                                                                                                
    try {                                                                                                                                                                                       
        // Tenta resolver o hostname para obter todos os IPs                                                                                                                                    
        const addresses = await dns.resolve4(host)                                                                                                                                              
                                                                                                                                                                                                
        if (addresses.length === 0) {                                                                                                                                                           
            throw new Error('No addresses found')                                                                                                                                               
        }                                                                                                                                                                                       
                                                                                                                                                                                                
        // Converte para o formato que o memcached espera: host:port                                                                                                                            
        return addresses.map(ip => `${ip}:${port}`)                                                                                                                                             
    } catch (err) {                                                                                                                                                                             
        // Fallback: usa o hostname original (funciona em dev com Docker)                                                                                                                       
        console.warn(`DNS resolution failed for ${host}, using original hostname: ${err.message}`)                                                                                              
        return [MEMCACHED_HOST]                                                                                                                                                                 
    }                                                                                                                                                                                           
}       

                                                                                                                                                                                                
function create(server_list)  {
    return new Memcached(server_list, {
        retries: 3,
        retry: 1000,
        timeout: 500,
        poolSize: 10,
        maxValue: 30 * 1024 * 1024
    })
    
}

async function getCacheClient() {                                                                                                                                                               
    const servers = await getMemcachedServers()                                                                                                                                                 
    console.log(`MAPPED IPS: \n\n${servers}`)
    if (servers.length == 0) 
        return create(MEMCACHED_HOST)

    return create(servers)
}                                                                                                                                                                                               


module.exports = {getCacheClient}
