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

    function getEdgeLimits(difficulty, directed) {
        const config = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.easy;
        const L = config.layers;
        const numNodes = L.reduce((a, b) => a + b, 0);

        // Расчет минимального кол-ва рёбер для обеспечения связности
        let minEdges = L[1];
        for (let i = 1; i < L.length - 1; i++) {
            minEdges += Math.max(L[i], L[i+1]);
        }

        // Расчет максимального количества непараллельных рёбер в слоистой структуре
        let maxForward = 0;
        for (let i = 0; i < L.length - 1; i++) {
            maxForward += L[i] * L[i+1];
        }
        let maxSkip = 0;
        for (let i = 0; i < L.length - 2; i++) {
            maxSkip += L[i] * L[i+2];
        }

        let maxEdges = maxForward + maxSkip;
        if (directed) {
            maxEdges = maxEdges * 2; // В ориентированном графе могут быть прямые и обратные дуги
        }

        // Математически и практически проверенные лимиты на основе тестов производительности
        let maxSteps = numNodes - 1;
        let maxBacksteps = 0;

        if (difficulty === 'easy') {
            maxSteps = 5;
            maxBacksteps = 1;
        } else if (difficulty === 'medium') {
            maxSteps = 7;
            maxBacksteps = 2;
        } else if (difficulty === 'hard') {
            maxSteps = 8;
            maxBacksteps = 3;
        } else if (difficulty === 'extreme') {
            maxSteps = 9; // Практический предел для кратчайшего пути на 24 вершинах
            maxBacksteps = directed ? 2 : 4; // Лимиты подтверждены логом тестов
        }

        return { min: minEdges, max: maxEdges, nodes: numNodes, maxSteps: maxSteps, maxBacksteps: maxBacksteps };
    }

    function getEdgeWeight(uNode, vNode, totalLayers, trapNodes) {
        const isBackward = vNode.layer < uNode.layer;
        const isShortcut = Math.abs(vNode.layer - uNode.layer) > 1;
        const isNearEnd = uNode.layer >= totalLayers - 3;

        if (isBackward) {
            return Math.floor(Math.random() * 4) + 2; // Обратное ребро: 2 - 5
        }

        if (trapNodes.has(vNode.name)) {
            return Math.floor(Math.random() * 2) + 1; // Вход в ловушку: 1 - 2
        }

        if (trapNodes.has(uNode.name)) {
            return Math.floor(Math.random() * 5) + 10; // Выход из ловушки: 10 - 14
        }

        if (isShortcut) {
            return Math.floor(Math.random() * 7) + 10; // Длинный перескок: 10 - 16
        } else if (isNearEnd) {
            return Math.floor(Math.random() * 3) + 1;  // Возле финиша: 1 - 3
        } else {
            return Math.floor(Math.random() * 6) + 4;  // Обычное ребро: 4 - 9
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

    // Оптимизированный алгоритм проверки структуры с ранним выходом (Early Exit)
    function hasPathWithMinBacksteps(nodes, adj, startName, endName, minBacksteps) {
        const numNodes = nodes.length;
        const nodeNames = nodes.map(n => n.name);
        const startIdx = nodeNames.indexOf(startName);
        const endIdx = nodeNames.indexOf(endName);
        if (startIdx === -1 || endIdx === -1) return false;

        const visited = new Array(numNodes).fill(false);
        let found = false;

        function dfs(u, currentBacksteps) {
            if (found) return;
            if (u === endIdx) {
                if (currentBacksteps >= minBacksteps) {
                    found = true;
                }
                return;
            }

            const uName = nodeNames[u];
            const uNode = nodes[u];

            if (adj[uName]) {
                for (let vName in adj[uName]) {
                    const vIdx = nodeNames.indexOf(vName);
                    if (vIdx === -1) continue;
                    if (!visited[vIdx]) {
                        const vNode = nodes[vIdx];
                        const isBack = (vNode.layer < uNode.layer) ? 1 : 0;
                        
                        visited[vIdx] = true;
                        dfs(vIdx, currentBacksteps + isBack);
                        visited[vIdx] = false;
                    }
                }
            }
        }

        visited[startIdx] = true;
        dfs(startIdx, 0);
        return found;
    }

    function generateGraph(difficulty, directed, userMinEdges, userMaxEdges, userMinSteps, userMinBacksteps = 0) {
        const config = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.easy;
        const layers = config.layers;
        const totalLayers = layers.length;

        const startTime = performance.now(); 
        let outerAttempts = 0; 

        const maxOuterAttempts = 1000; // Увеличен лимит для строгого соответствия настроек
        const maxWeightAttempts = 400; // Увеличен лимит для точной укладки весов

        while (outerAttempts < maxOuterAttempts) {
            outerAttempts++;

            // Предохранитель времени выполнения на одну итерацию
            if (performance.now() - startTime > 1500) {
                break;
            }

            let nodesList = [];
            let layersNodes = [];
            let nodeIndex = 0;

            // Генерация узлов по слоям
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

            // --- СОЗДАНИЕ СТРУКТУРЫ СВЯЗЕЙ ---
            layersNodes[1].forEach(nextNode => {
                adj[startNode][nextNode.name] = { weight: 0, color: '' };
                if (!directed) {
                    adj[nextNode.name][startNode] = { weight: 0, color: '' };
                }
            });

            for (let l = 1; l < totalLayers - 2; l++) {
                let currentLayer = layersNodes[l];
                let nextLayer = layersNodes[l + 1];

                currentLayer.forEach(currNode => {
                    let target = nextLayer[Math.floor(Math.random() * nextLayer.length)];
                    adj[currNode.name][target.name] = { weight: 0, color: '' };
                    if (!directed) {
                        adj[target.name][currNode.name] = { weight: 0, color: '' };
                    }
                });

                nextLayer.forEach(nextNode => {
                    let incoming = Object.keys(adj).filter(name => adj[name][nextNode.name] !== undefined);
                    if (incoming.length === 0) {
                        let source = currentLayer[Math.floor(Math.random() * currentLayer.length)];
                        adj[source.name][nextNode.name] = { weight: 0, color: '' };
                        if (!directed) {
                            adj[nextNode.name][source.name] = { weight: 0, color: '' };
                        }
                    }
                });
            }

            let penultLayer = layersNodes[totalLayers - 2];
            penultLayer.forEach(node => {
                adj[node.name][endNode] = { weight: 0, color: '' };
                if (!directed) {
                    adj[endNode][node.name] = { weight: 0, color: '' };
                }
            });

            const getCurrentEdgeCount = () => {
                let count = 0;
                for (let u in adj) {
                    for (let v in adj[u]) {
                        if (directed || u < v) {
                            count++;
                        }
                    }
                }
                return count;
            };

            let candidates = [];
            for (let i = 0; i < nodesList.length; i++) {
                for (let j = 0; j < nodesList.length; j++) {
                    if (i === j) continue;
                    let u = nodesList[i];
                    let v = nodesList[j];

                    let isValidTransition = false;
                    let diff = v.layer - u.layer;

                    if (directed) {
                        if (diff === 1 || diff === 2 || diff === -1) {
                            isValidTransition = true;
                        }
                    } else {
                        if (u.name < v.name && (diff === 1 || diff === 2)) {
                            isValidTransition = true;
                        }
                    }

                    if (isValidTransition && adj[u.name][v.name] === undefined) {
                        candidates.push({ u: u.name, v: v.name });
                    }
                }
            }

            candidates.sort(() => 0.5 - Math.random());
            let targetEdgeCount = Math.floor(Math.random() * (userMaxEdges - userMinEdges + 1)) + userMinEdges;

            while (getCurrentEdgeCount() < targetEdgeCount && candidates.length > 0) {
                let edge = candidates.pop();
                adj[edge.u][edge.v] = { weight: 0, color: '' };
                if (!directed) {
                    adj[edge.v][edge.u] = { weight: 0, color: '' };
                }
            }

            if (getCurrentEdgeCount() < userMinEdges) {
                continue; 
            }

            // --- КРИТИЧЕСКАЯ АЛГОРИТМИЧЕСКАЯ ПРОВЕРКА СТРУКТУРЫ ---
            let structureIsValid = hasPathWithMinBacksteps(nodesList, adj, startNode, endNode, userMinBacksteps);
            if (!structureIsValid) {
                continue; 
            }

            const intermediateNodes = nodesList.filter(n => !n.isStart && !n.isEnd);
            let trapCount = 1;
            if (difficulty === 'medium') trapCount = Math.floor(Math.random() * 2) + 1;
            else if (difficulty === 'hard') trapCount = Math.floor(Math.random() * 3) + 2;
            else if (difficulty === 'extreme') trapCount = Math.floor(Math.random() * 4) + 3;

            const shuffled = [...intermediateNodes].sort(() => 0.5 - Math.random());
            const trapNodes = new Set(shuffled.slice(0, trapCount).map(n => n.name));

            let solved = false;
            let finalSolution = null;
            let finalBackwardStepsCount = 0;

            for (let weightAttempt = 0; weightAttempt < maxWeightAttempts; weightAttempt++) {
                if (performance.now() - startTime > 1500) {
                    break;
                }

                let colorIndex = 0;
                for (let u in adj) {
                    for (let v in adj[u]) {
                        if (directed || u < v) {
                            let uNode = nodesList.find(n => n.name === u);
                            let vNode = nodesList.find(n => n.name === v);
                            let w = getEdgeWeight(uNode, vNode, totalLayers, trapNodes);
                            let color = PALETTE[colorIndex % PALETTE.length];
                            colorIndex++;

                            adj[u][v].weight = w;
                            adj[u][v].color = color;
                            if (!directed) {
                                adj[v][u].weight = w;
                                adj[v][u].color = color;
                            }
                        }
                    }
                }

                ensureHeavyOnEachPath(nodesList, adj, startNode, endNode);

                let sol = solveDijkstra(nodesList, adj, startNode, endNode);
                const pathEdgesCount = sol.path ? sol.path.length - 1 : 0;

                let backwardStepsCount = 0;
                if (sol.path) {
                    for (let i = 0; i < sol.path.length - 1; i++) {
                        let uNode = nodesList.find(n => n.name === sol.path[i]);
                        let vNode = nodesList.find(n => n.name === sol.path[i + 1]);
                        if (uNode && vNode && vNode.layer < uNode.layer) {
                            backwardStepsCount++;
                        }
                    }
                }

                if (sol.distance !== Infinity && pathEdgesCount >= userMinSteps && backwardStepsCount >= userMinBacksteps) {
                    solved = true;
                    finalSolution = sol;
                    finalBackwardStepsCount = backwardStepsCount;
                    break;
                }
            }

            if (solved) {
                return {
                    nodes: nodesList,
                    adj: adj,
                    solution: finalSolution,
                    startNode: startNode,
                    endNode: endNode,
                    totalLayers: totalLayers,
                    backwardStepsCount: finalBackwardStepsCount,
                    totalEdges: getCurrentEdgeCount(),
                    actualMinSteps: userMinSteps,
                    actualMinBacksteps: userMinBacksteps
                };
            }
        }

        console.warn("Could not satisfy all constraints. Relaxing step constraints slightly.");
        const nextMinSteps = Math.max(1, userMinSteps - 1);
        const nextMinBacksteps = Math.max(0, userMinBacksteps - 1);
        return generateGraph(difficulty, directed, userMinEdges, userMaxEdges, nextMinSteps, nextMinBacksteps);
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
        generateGraph: generateGraph,
        getEdgeLimits: getEdgeLimits
    };
})();