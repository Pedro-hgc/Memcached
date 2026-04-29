#include <iostream>
#include <string>
#include <chrono>
#include <thread>
#include <libmemcached/memcached.h>

void simulacao_funcao_lenta() {
    std::cout << "--- [BD] Buscando no banco de dados (lento)..." << std::endl;
    // Simula um atraso de 3 segundos
    std::this_thread::sleep_for(std::chrono::seconds(3));
}

int main() {
    memcached_return rc;
    
    // 1. Criar o objeto principal do Memcached
    memcached_st *memc = memcached_create(NULL);

    // 2. Configurar o Cluster (Portas 12001 e 12002)
    memcached_server_st *servers = memcached_server_list_append(NULL, "127.0.0.1", 12001, &rc);
    servers = memcached_server_list_append(servers, "127.0.0.1", 12002, &rc);
    servers = memcached_server_list_append(servers, "127.0.0.1", 12003, &rc);
    servers = memcached_server_list_append(servers, "127.0.0.1", 12004, &rc);
    memcached_server_push(memc, servers);
    memcached_server_list_free(servers);

    // 3. Comportamentos Críticos para a Demo (Forçar sincronização e remover delays)
    memcached_behavior_set(memc, MEMCACHED_BEHAVIOR_TCP_NODELAY, 1);
    memcached_behavior_set(memc, MEMCACHED_BEHAVIOR_BINARY_PROTOCOL, 0); // Protocolo texto é melhor para ver o log -vv

    // 4. Interação com o usuário para demonstrar Sharding (Distribuição)
    std::string key;
    std::cout << "\n===============================================" << std::endl;
    std::cout << "DEMO SISTEMAS DISTRIBUIDOS - UFOP" << std::endl;
    std::cout << "Digite uma chave (ex: 'user1', 'user2'): ";
    std::cin >> key;
    std::cout << "===============================================" << std::endl;

    size_t val_len;
    uint32_t flags;

    // 5. TENTATIVA DE GET
    char* cache_result = memcached_get(memc, key.c_str(), key.length(), &val_len, &flags, &rc);

    if (rc == MEMCACHED_SUCCESS) {
        std::cout << ">>> RESULTADO: CACHE HIT! (Dados recuperados da RAM)" << std::endl;
        std::cout << ">>> VALOR: " << std::string(cache_result, val_len) << std::endl;
        free(cache_result);
    } 
    else {
        std::cout << ">>> RESULTADO: CACHE MISS! (Iniciando processamento pesado...)" << std::endl;
        
        auto start = std::chrono::steady_clock::now();
        simulacao_funcao_lenta();
        
        std::string valor = "Processado_em_2026";
        
        // 6. SET (Salva por 300 segundos)
        rc = memcached_set(memc, key.c_str(), key.length(), valor.c_str(), valor.length(), 300, 0);
        
        if (rc == MEMCACHED_SUCCESS) {
            std::cout << ">>> SUCESSO: Dados armazenados no cluster." << std::endl;
        } else {
            std::cout << ">>> ERRO AO SALVAR: " << memcached_strerror(memc, rc) << std::endl;
        }

        auto end = std::chrono::steady_clock::now();
        std::chrono::duration<double> diff = end - start;
        std::cout << ">>> Tempo total de resposta: " << diff.count() << "s." << std::endl;
    }

    memcached_free(memc);
    return 0;
}