/**
 * graph.js - Модуль генерации графа и поиска кратчайшего пути (алгоритм Дейкстры).
 */
window.GraphModule = (function() {

    // Палитра контрастных цветов
    const PALETTE = [
        '#ef4444', // Красный
        '#00c000', // Зеленый
        '#0080ff', // Голубой
        '#ffc000', // Желтый
        '#ff60a0'  // Розовый
    ];

    const DIFFICULTY_CONFIG = {
        easy: { nodeCount: 6, layers: [1, 2, 2, 1] },
        medium: { nodeCount: 10, layers: [1, 3, 3, 2, 1] },
        hard: { nodeCount: 16, layers: [1, 3, 4, 4, 3, 1] },
        extreme: { nodeCount: 24, layers: [1, 4, 5, 5, 5, 3, 1] } 
    };

    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

    function calculateWeight(fromLayer, toLayer, totalLayers) {
        const isShortcut = Math.abs(toLayer - fromLayer) > 1;
        const isNearEnd = fromLayer >= totalLayers - 3;

        if (isShortcut) {
            return Math.floor(Math.random() * 7) + 10; // Тяжелые обходы: 10 - 16
        } else if (isNearEnd) {
            return Math.floor(Math.random() * 3) + 1;  // Легковесные цепочки в конце: 1 - 3
        } else {
            return Math.floor(Math.random() * 6) + 4;  // Обычные ребра: 4 - 9
        }
    }

    // Поиск любого пути от start до end, состоящего только из ребер легче, чем threshold
    function findLightPath(nodes, adj, start, end, threshold) {
        let queue = [[start]];
        let visited = new Set([start]);
        
        while (queue.length > 0) {
            let path = queue.shift();
            let u = path[path.length - 1];
            
            if (u === end) {
                return path;
            }
            
            if (adj[u]) {
                for (let v in adj[u]) {
                    if (!visited.has(v) && adj[u][v].weight < threshold) {
                        visited.add(v);
                        queue.push([...path, v]);
                    }
                }
            }
        }
        return null;
    }

    // Балансировка: гарантируем, что на каждом пути есть хотя бы одно ребро >= 8
    function ensureHeavyOnEachPath(nodes, adj, start, end) {
        const HEAVY_THRESHOLD = 8;
        let safetyCounter = 0;
        const maxIterations = 100;

        while (safetyCounter < maxIterations) {
            let lightPath = findLightPath(nodes, adj, start, end, HEAVY_THRESHOLD);
            if (!lightPath) {
                break; 
            }

            let edgeIndex = Math.floor(Math.random() * (lightPath.length - 1));
            let u = lightPath[edgeIndex];
            let v = lightPath[edgeIndex + 1];

            let newWeight = Math.floor(Math.random() * 6) + 10;

            if (adj[u] && adj[u][v]) {
                adj[u][v].weight = newWeight;
            }
            if (adj[v] && adj[v][u]) {
                adj[v][u].weight = newWeight;
            }

            safetyCounter++;
        }
    }

    function generateGraph(difficulty, directed, requireBackward) {
        const config = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.easy;
        const layers = config.layers;
        const totalLayers = layers.length;

        let attempts = 0; 

        // Цикл генерации для исключения глубокой рекурсии
        while (true) {
            attempts++;
            let nodesList = [];
            let layersNodes = [];
            let nodeIndex = 0;

            for (let l = 0; l < totalLayers; l++) {
                let size = layers[l];
                let layerList = [];
                for (let i = 0; i < size; i++) {
                    let name = alphabet[nodeIndex++];
                    let node = {
                        name: name,
                        layer: l,
                        isStart: (l === 0),
                        isEnd: (l === totalLayers - 1)
                    };
                    nodesList.push(node);
                    layerList.push(node);
                }
                layersNodes.push(layerList);
            }

            const startNode = nodesList[0].name;
            const endNode = nodesList[nodesList.length - 1].name;

            let adj = {};
            nodesList.forEach(node => {
                adj[node.name] = {};
            });

            let colorIndex = 0;

            // --- ГЕНЕРАЦИЯ ДИНАМИЧЕСКИХ ЛОВУШЕК ---
            const intermediateNodes = nodesList.filter(n => !n.isStart && !n.isEnd);
            let trapCount = 1;
            if (difficulty === 'medium') trapCount = Math.floor(Math.random() * 2) + 1;
            else if (difficulty === 'hard') trapCount = Math.floor(Math.random() * 3) + 2;
            else if (difficulty === 'extreme') trapCount = Math.floor(Math.random() * 4) + 3;

            const shuffled = [...intermediateNodes].sort(() => 0.5 - Math.random());
            const trapNodes = new Set(shuffled.slice(0, trapCount).map(n => n.name));

            // 2. Генерация ребер со статической привязкой цвета из палитры
            for (let l = 0; l < totalLayers - 1; l++) {
                let currentLayer = layersNodes[l];
                let nextLayer = layersNodes[l + 1];

                if (l === 0) {
                    let currNode = currentLayer[0]; 
                    nextLayer.forEach(nextNode => {
                        let w;
                        if (trapNodes.has(nextNode.name)) {
                            w = Math.floor(Math.random() * 2) + 1; 
                        } else {
                            w = Math.floor(Math.random() * 4) + 7; 
                        }
                        let edgeColor = PALETTE[colorIndex % PALETTE.length];
                        colorIndex++;

                        adj[currNode.name][nextNode.name] = { weight: w, color: edgeColor };
                        if (!directed) {
                            adj[nextNode.name][currNode.name] = { weight: w, color: edgeColor };
                        }
                    });
                } 
                else if (l === 1) {
                    let nonTrapNodes = currentLayer.filter(n => !trapNodes.has(n.name));

                    currentLayer.forEach(currNode => {
                        const isCurrTrap = trapNodes.has(currNode.name);
                        if (isCurrTrap) {
                            nextLayer.forEach(nextNode => {
                                let w = Math.floor(Math.random() * 5) + 10; 
                                let edgeColor = PALETTE[colorIndex % PALETTE.length];
                                colorIndex++;

                                adj[currNode.name][nextNode.name] = { weight: w, color: edgeColor };
                                if (!directed) {
                                    adj[nextNode.name][currNode.name] = { weight: w, color: edgeColor };
                                }
                            });
                        } else {
                            let target = nextLayer[Math.floor(Math.random() * nextLayer.length)];
                            const isTargetTrap = trapNodes.has(target.name);
                            
                            let w;
                            if (isTargetTrap) {
                                w = Math.floor(Math.random() * 2) + 1; 
                            } else {
                                w = calculateWeight(l, l + 1, totalLayers);
                            }
                            
                            let edgeColor = PALETTE[colorIndex % PALETTE.length];
                            colorIndex++;

                            adj[currNode.name][target.name] = { weight: w, color: edgeColor };
                            if (!directed) {
                                adj[target.name][currNode.name] = { weight: w, color: edgeColor };
                            }
                        }
                    });

                    nextLayer.forEach(nextNode => {
                        let incoming = Object.keys(adj).filter(name => adj[name][nextNode.name] !== undefined);
                        if (incoming.length === 0) {
                            let source = nonTrapNodes.length > 0 
                                ? nonTrapNodes[Math.floor(Math.random() * nonTrapNodes.length)]
                                : currentLayer[Math.floor(Math.random() * currentLayer.length)];
                            
                            const isSourceTrap = trapNodes.has(source.name);
                            const isNextTrap = trapNodes.has(nextNode.name);
                            
                            let w;
                            if (isSourceTrap) {
                                w = Math.floor(Math.random() * 5) + 10;
                            } else if (isNextTrap) {
                                w = Math.floor(Math.random() * 2) + 1;
                            } else {
                                w = calculateWeight(l, l + 1, totalLayers);
                            }

                            let edgeColor = PALETTE[colorIndex % PALETTE.length];
                            colorIndex++;

                            adj[source.name][nextNode.name] = { weight: w, color: edgeColor };
                            if (!directed) {
                                adj[nextNode.name][source.name] = { weight: w, color: edgeColor };
                            }
                        }
                    });
                } 
                else {
                    currentLayer.forEach(currNode => {
                        let target = nextLayer[Math.floor(Math.random() * nextLayer.length)];
                        let w = calculateWeight(l, l + 1, totalLayers);
                        let edgeColor = PALETTE[colorIndex % PALETTE.length];
                        colorIndex++;

                        adj[currNode.name][target.name] = { weight: w, color: edgeColor };
                        if (!directed) {
                            adj[target.name][currNode.name] = { weight: w, color: edgeColor };
                        }
                    });

                    nextLayer.forEach(nextNode => {
                        let incoming = Object.keys(adj).filter(name => adj[name][nextNode.name] !== undefined);
                        if (incoming.length === 0) {
                            let source = currentLayer[Math.floor(Math.random() * currentLayer.length)];
                            let w = calculateWeight(l, l + 1, totalLayers);
                            let edgeColor = PALETTE[colorIndex % PALETTE.length];
                            colorIndex++;

                            adj[source.name][nextNode.name] = { weight: w, color: edgeColor };
                            if (!directed) {
                                adj[nextNode.name][source.name] = { weight: w, color: edgeColor };
                            }
                        }
                    });
                }
            }

            // 3. Добавление перескоков через слой
            for (let l = 0; l < totalLayers - 2; l++) {
                let currentLayer = layersNodes[l];
                let skipLayer = layersNodes[l + 2];

                currentLayer.forEach(currNode => {
                    if (Math.random() < 0.4) {
                        let target = skipLayer[Math.floor(Math.random() * skipLayer.length)];
                        
                        const isCurrTrap = trapNodes.has(currNode.name);
                        const isTargetTrap = trapNodes.has(target.name);
                        
                        let w;
                        if (isCurrTrap) {
                            w = Math.floor(Math.random() * 5) + 15; 
                        } else if (isTargetTrap) {
                            w = Math.floor(Math.random() * 2) + 2;  
                        } else {
                            w = calculateWeight(l, l + 2, totalLayers);
                        }
                        
                        let edgeColor = PALETTE[colorIndex % PALETTE.length];
                        colorIndex++;

                        adj[currNode.name][target.name] = { weight: w, color: edgeColor };
                        if (!directed) {
                            adj[target.name][currNode.name] = { weight: w, color: edgeColor };
                        }
                    }
                });
            }

            // --- 4. Добавление обратных ребер (шаг назад) для ориентированного графа ---
            if (directed) {
                for (let l = 1; l < totalLayers - 1; l++) {
                    let currentLayer = layersNodes[l];
                    let prevLayer = layersNodes[l - 1]; 

                    currentLayer.forEach(currNode => {
                        if (Math.random() < 0.35) {
                            let validTargets = prevLayer.filter(targetNode => {
                                let noForwardEdge = adj[targetNode.name][currNode.name] === undefined;
                                let noBackwardEdgeYet = adj[currNode.name][targetNode.name] === undefined;
                                return noForwardEdge && noBackwardEdgeYet;
                            });

                            if (validTargets.length > 0) {
                                let target = validTargets[Math.floor(Math.random() * validTargets.length)];
                                
                                let w = Math.floor(Math.random() * 4) + 2; 
                                let edgeColor = PALETTE[colorIndex % PALETTE.length];
                                colorIndex++;

                                adj[currNode.name][target.name] = { weight: w, color: edgeColor };
                            }
                        }
                    });
                }
            }

            // --- БАЛАНСИРОВКА: На каждом пути от старта до финиша должен быть как минимум один тяжелый узел (ребро) ---
            ensureHeavyOnEachPath(nodesList, adj, startNode, endNode);

            let sol = solveDijkstra(nodesList, adj, startNode, endNode);
            
            // Фильтрация длины пути
            let minEdges = 1; 
            let maxEdges = Infinity;

            if (difficulty === 'hard') {
                minEdges = 4;
            } else if (difficulty === 'extreme') {
                minEdges = 7;
                maxEdges = 10;
            }

            const pathEdgesCount = sol.path ? sol.path.length - 1 : 0;

            // Логика проверки на обязательный "шаг назад"
            let hasBackStep = true;
            if (requireBackward && sol.path && attempts < 500) {
                hasBackStep = false;
                for (let i = 0; i < sol.path.length - 1; i++) {
                    let uNode = nodesList.find(n => n.name === sol.path[i]);
                    let vNode = nodesList.find(n => n.name === sol.path[i + 1]);
                    if (uNode && vNode) {
                        if (vNode.layer < uNode.layer) {
                            hasBackStep = true;
                            break;
                        }
                    }
                }
            }

            if (sol.distance !== Infinity && pathEdgesCount >= minEdges && pathEdgesCount <= maxEdges && hasBackStep) {
                return {
                    nodes: nodesList,
                    adj: adj,
                    solution: sol,
                    startNode: startNode,
                    endNode: endNode,
                    totalLayers: totalLayers
                };
            }
        }
    }

    function solveDijkstra(nodes, adj, start, end) {
        let distances = {};
        let prev = {};
        let queue = new Set();

        nodes.forEach(node => {
            distances[node.name] = Infinity;
            prev[node.name] = null;
            queue.add(node.name);
        });
        distances[start] = 0;

        while (queue.size > 0) {
            let u = null;
            for (let node of queue) {
                if (u === null || distances[node] < distances[u]) {
                    u = node;
                }
            }

            if (distances[u] === Infinity || u === end) break;
            queue.delete(u);

            for (let neighbor in adj[u]) {
                let alt = distances[u] + adj[u][neighbor].weight;
                if (alt < distances[neighbor]) {
                    distances[neighbor] = alt;
                    prev[neighbor] = u;
                }
            }
        }

        let path = [];
        let curr = end;
        if (prev[curr] !== null || curr === start) {
            while (curr !== null) {
                path.unshift(curr);
                curr = prev[curr];
            }
        }

        return { distance: distances[end], path: path };
    }

    return {
        generateGraph: generateGraph
    };
})();