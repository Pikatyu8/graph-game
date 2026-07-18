/**
 * game.js - Отрисовка холста, анимация переходов, интерактив с пользователем, локализация и поддержка тем.
 */
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('graph-canvas');
    const ctx = canvas.getContext('2d');

    const btnNewGame = document.getElementById('btn-new-game');
    const btnResetPath = document.getElementById('btn-reset-path');
    const btnCheck = document.getElementById('btn-check');
    const btnShowSolution = document.getElementById('btn-show-solution');
    const pathDisplay = document.getElementById('path-display');
    const feedbackBox = document.getElementById('feedback-box');
    const diffButtons = document.querySelectorAll('.diff-btn');
    const btnTheme = document.getElementById('btn-theme');
    const btnFullscreen = document.getElementById('btn-fullscreen');
    const btnExitFullscreenOverlay = document.getElementById('btn-exit-fullscreen-overlay');
    const btnLang = document.getElementById('btn-lang');
    const chkBackward = document.getElementById('chk-require-backward');

    let currentDifficulty = 'easy';
    let directed = false;
    let graphData = null;
    let userPath = [];
    let gameState = 'playing'; 
    let hoveredEdge = null; 
    let showOptimalPath = false; 

    // Мультиязычная система
    let currentLang = 'en';

    const translations = {
        en: {
            title: "Dijkstra Trainer: Mental Shortest Path",
            howToPlay: "How to Play:",
            rule1: "Choose difficulty and graph mode, then click <strong>«New Game»</strong> (or press <strong>N</strong>).",
            rule2: "Your task is to find the cheapest path from the green start node <strong>A</strong> to the red end node.",
            rule3: "<strong>Click on nodes/edges or press letters</strong> on your keyboard (e.g., A, B, C...) to build your path. Re-clicking a node or pressing its key backtracks your path.",
            rule4: "After reaching the final node, click <strong>«Verify»</strong> (or press <strong>Enter</strong>).",
            btnNewGame: "New Game",
            btnResetPath: "Reset Path",
            btnCheck: "Verify",
            btnShowSolution: "Show Solution",
            diffEasy: "Easy (6)",
            diffMedium: "Medium (10)",
            diffHard: "Hard (16)",
            diffExtreme: "Extreme (24)",
            modeUndirected: "Undirected",
            modeDirected: "Directed",
            modeBackward: "Require backward step (loop)",
            explainUndirected: "<strong>Undirected Graph:</strong> Edges have no arrows and can be traversed in both directions.",
            explainDirected: "<strong>Directed Graph:</strong> Edges have arrows and can only be traversed in the direction they point. Backwards steps must use explicitly generated backwards arcs.",
            pathPrefix: "Your path: ",
            pathSum: "Sum",
            feedbackFinish: "You must reach the end node ({endNode})!",
            feedbackSuccess: "Correct! You successfully found the shortest path! Path length: {sum}.",
            feedbackError: "Incorrect. The optimal path length is {distance}.",
            feedbackOptimalPath: "Optimal path: ",
            tooltipNewGame: "Hotkey: N",
            tooltipReset: "Hotkey: C",
            tooltipCheck: "Hotkey: Enter",
            tooltipSolution: "Hotkey: S",
            tooltipTheme: "Toggle light/dark theme",
            tooltipFullscreen: "Toggle fullscreen mode"
        },
        ru: {
            title: "Тренажер Дейкстры: Кратчайший путь в уме",
            howToPlay: "Как играть:",
            rule1: "Выберите уровень сложности и тип графа, затем нажмите <strong>«Новая игра»</strong> (или клавишу <strong>N</strong>).",
            rule2: "Ваша задача — проложить самый выгодный путь от стартовой зеленой вершины <strong>A</strong> до финальной красной вершины.",
            rule3: "<strong>Кликайте по вершинам, ребрам или нажимайте буквы</strong> (например, A, B, C...), чтобы строить путь. Повторный клик или нажатие клавиши отменяет шаги до неё.",
            rule4: "После завершения пути нажмите кнопку <strong>«Проверить»</strong> (или клавишу <strong>Enter</strong>).",
            btnNewGame: "Новая игра",
            btnResetPath: "Сбросить путь",
            btnCheck: "Проверить",
            btnShowSolution: "Посмотреть последовательность",
            diffEasy: "Базовый (6)",
            diffMedium: "Средний (10)",
            diffHard: "Сложный (16)",
            diffExtreme: "Экстрим (24)",
            modeUndirected: "Неориентированный",
            modeDirected: "Ориентированный",
            modeBackward: "Обязательный шаг назад (петля)",
            explainUndirected: "<strong>Неориентированный граф:</strong> рёбра не имеют направления, по ним можно ходить в обе стороны.",
            explainDirected: "<strong>Ориентированный граф:</strong> рёбра имеют стрелки и могут быть пройдены только в указанном направлении. Шаг назад возможен только по явным обратным рёбрам.",
            pathPrefix: "Ваш путь: ",
            pathSum: "Сумма",
            feedbackFinish: "Вы должны дойти до конечной вершины ({endNode})!",
            feedbackSuccess: "Правильно! Вы успешно нашли кратчайший путь! Длина пути: {sum}.",
            feedbackError: "Неверно. Минимальная длина кратчайшего пути: {distance}.",
            feedbackOptimalPath: "Оптимальный путь: ",
            tooltipNewGame: "Горячая клавиша: N",
            tooltipReset: "Горячая клавиша: C",
            tooltipCheck: "Горячая клавиша: Enter",
            tooltipSolution: "Горячая клавиша: S",
            tooltipTheme: "Переключить тему",
            tooltipFullscreen: "Полноэкранный режим"
        }
    };

    function getNodeRadius() {
        if (currentDifficulty === 'hard') return 18;
        if (currentDifficulty === 'extreme') return 14;
        return 22;
    }

    function distToSegment(p, v, w) {
        let l2 = (v.x - w.x)**2 + (v.y - w.y)**2;
        if (l2 === 0) return Math.sqrt((p.x - v.x)**2 + (p.y - v.y)**2);
        let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
        t = Math.max(0, Math.min(1, t));
        let proj = {
            x: v.x + t * (w.x - v.x),
            y: v.y + t * (w.y - v.y)
        };
        return Math.sqrt((p.x - proj.x)**2 + (p.y - proj.y)**2);
    }

    function getPointOnCurve(edge, t, nodeU, nodeV) {
        let x1 = nodeU.x, y1 = nodeU.y;
        let x2 = nodeV.x, y2 = nodeV.y;
        if (!edge.curve || Math.abs(edge.curve) < 1) {
            return { x: x1 + t * (x2 - x1), y: y1 + t * (y2 - y1) };
        } else {
            let mx = (x1 + x2) / 2;
            let my = (y1 + y2) / 2;
            let dx = x2 - x1, dy = y2 - y1;
            let dist = Math.sqrt(dx*dx + dy*dy);
            let nx = -dy/dist, ny = dx/dist;
            let cpx = mx + edge.curve * nx;
            let cpy = my + edge.curve * ny;
            
            let x = (1-t)**2 * x1 + 2*(1-t)*t * cpx + t**2 * x2;
            let y = (1-t)**2 * y1 + 2*(1-t)*t * cpy + t**2 * y2;
            return { x, y };
        }
    }

    function snapToCurve(edge, wx, wy, nodeU, nodeV) {
        let bestPt = null;
        let minDist = Infinity;
        for (let t = 0.25; t <= 0.75; t += 0.02) {
            let pt = getPointOnCurve(edge, t, nodeU, nodeV);
            let d = Math.sqrt((wx - pt.x)**2 + (wy - pt.y)**2);
            if (d < minDist) {
                minDist = d;
                bestPt = pt;
            }
        }
        return bestPt;
    }

    function assignCoordinates() {
        const W = canvas.width;
        const H = canvas.height;
        const padX = 70;
        const padY = 50;
        const L = graphData.totalLayers;

        let layersCount = Array(L).fill(0);
        let layersIndex = Array(L).fill(0);

        graphData.nodes.forEach(n => layersCount[n.layer]++);

        graphData.nodes.forEach(node => {
            const col = node.layer;
            const count = layersCount[col];
            const index = layersIndex[col]++;

            node.x = padX + col * ((W - 2 * padX) / (L - 1));

            if (count === 1) {
                node.y = H / 2;
            } else {
                node.y = padY + index * ((H - 2 * padY) / (count - 1));
            }
        });

        const R = getNodeRadius();
        let uniqueEdges = [];

        for (let u in graphData.adj) {
            for (let v in graphData.adj[u]) {
                if (!directed && u > v) continue; 
                
                let edge = graphData.adj[u][v];
                edge.u = u;
                edge.v = v;
                edge.curve = 0; 
                uniqueEdges.push(edge);
            }
        }

        // --- ШАГ 1: Динамический расчет обхода препятствий (сторонних узлов) ---
        uniqueEdges.forEach(edge => {
            let nodeU = graphData.nodes.find(n => n.name === edge.u);
            let nodeV = graphData.nodes.find(n => n.name === edge.v);
            
            graphData.nodes.forEach(node => {
                if (node.name === edge.u || node.name === edge.v) return;
                
                let d = distToSegment(node, nodeU, nodeV);
                let minDistNode = R + 22; 
                if (d < minDistNode) {
                    let targetClearance = R + 25;
                    let requiredBend = 2 * (targetClearance - d);
                    
                    requiredBend = Math.min(85, Math.max(35, requiredBend));

                    let cross = (nodeV.x - nodeU.x) * (node.y - nodeU.y) - (nodeV.y - nodeU.y) * (node.x - nodeU.x);
                    let bendSign = cross >= 0 ? -1 : 1;
                    edge.curve = bendSign * requiredBend;
                }
            });
        });

        // --- ШАГ 2: Разведение параллельных/накладывающихся ребер ---
        for (let i = 0; i < uniqueEdges.length; i++) {
            for (let j = i + 1; j < uniqueEdges.length; j++) {
                let e1 = uniqueEdges[i];
                let e2 = uniqueEdges[j];
                
                let u1 = graphData.nodes.find(n => n.name === e1.u);
                let v1 = graphData.nodes.find(n => n.name === e1.v);
                let u2 = graphData.nodes.find(n => n.name === e2.u);
                let v2 = graphData.nodes.find(n => n.name === e2.v);
                
                let isParallel = (e1.u === e2.u && e1.v === e2.v);
                let isOpposite = (e1.u === e2.v && e1.v === e2.u);
                
                if (isParallel) {
                    if (e1.curve === 0 && e2.curve === 0) {
                        e1.curve = 30;
                        e2.curve = -30;
                    } else if (e1.curve !== 0 && e2.curve === 0) {
                        e2.curve = -e1.curve;
                    } else if (e2.curve !== 0 && e1.curve === 0) {
                        e1.curve = -e2.curve;
                    } else if (e1.curve * e2.curve > 0) {
                        e2.curve = -e2.curve;
                    }
                    continue; 
                }
                
                if (isOpposite) {
                    if (e1.curve === 0 && e2.curve === 0) {
                        e1.curve = 30;
                        e2.curve = 30; 
                    } else if (e1.curve !== 0 && e2.curve === 0) {
                        e2.curve = e1.curve;
                    } else if (e2.curve !== 0 && e1.curve === 0) {
                        e1.curve = e2.curve;
                    } else if (e1.curve * e2.curve < 0) {
                        e2.curve = -e2.curve;
                    }
                    continue; 
                }
                
                let m1 = { x: (u1.x + v1.x)/2, y: (u1.y + v1.y)/2 };
                let m2 = { x: (u2.x + v2.x)/2, y: (u2.y + v2.y)/2 };
                
                let d1 = distToSegment(m1, u2, v2);
                let d2 = distToSegment(m2, u1, v1);
                
                if (d1 < 16 || d2 < 16) {
                    if (e1.curve === 0) e1.curve = 30;
                    if (e2.curve === 0) e2.curve = -30;
                }
            }
        }

        // --- ШАГ 3: Защита от наложения на собственные концевые узлы (короткие ребра) ---
        const minDistWeight = R * 1.45 + 15; 

        uniqueEdges.forEach(edge => {
            let nodeU = graphData.nodes.find(n => n.name === edge.u);
            let nodeV = graphData.nodes.find(n => n.name === edge.v);
            
            let dx = nodeV.x - nodeU.x;
            let dy = nodeV.y - nodeU.y;
            let dist = Math.sqrt(dx*dx + dy*dy);
            
            if (dist < 2 * minDistWeight) {
                let requiredBend = Math.sqrt(4 * minDistWeight * minDistWeight - dist * dist);
                
                if (edge.curve === 0) {
                    edge.curve = requiredBend;
                } else {
                    if (Math.abs(edge.curve) < requiredBend) {
                        let sign = edge.curve >= 0 ? 1 : -1;
                        edge.curve = sign * requiredBend;
                    }
                }
            }
        });

        // --- ШАГ 4: Инициализация координат весов по дугам Безье ---
        uniqueEdges.forEach(edge => {
            let nodeU = graphData.nodes.find(n => n.name === edge.u);
            let nodeV = graphData.nodes.find(n => n.name === edge.v);
            
            let pt = getPointOnCurve(edge, 0.5, nodeU, nodeV);
            edge.wx = pt.x;
            edge.wy = pt.y;

            edge.wx += (Math.random() - 0.5) * 1.5;
            edge.wy += (Math.random() - 0.5) * 1.5;

            edge.originalWx = edge.wx;
            edge.originalWy = edge.wy;
        });

        // --- ШАГ 5: Физическое расталкивание весов методом Constraint Projection ---
        const iterations = 50;
        for (let iter = 0; iter < iterations; iter++) {
            
            uniqueEdges.forEach(edge => {
                let dx = edge.wx - edge.originalWx;
                let dy = edge.wy - edge.originalWy;
                edge.wx -= dx * 0.12;
                edge.wy -= dy * 0.12;
            });

            for (let i = 0; i < uniqueEdges.length; i++) {
                for (let j = i + 1; j < uniqueEdges.length; j++) {
                    let e1 = uniqueEdges[i];
                    let e2 = uniqueEdges[j];
                    let dx = e1.wx - e2.wx;
                    let dy = e1.wy - e2.wy;
                    let dist = Math.sqrt(dx*dx + dy*dy);
                    let minDist = 34; 
                    
                    if (dist < minDist) {
                        if (dist === 0) { dx = 1; dy = 0; dist = 1; }
                        let force = (minDist - dist) * 0.5;
                        e1.wx += (dx / dist) * force;
                        e1.wy += (dy / dist) * force;
                        e2.wx -= (dx / dist) * force;
                        e2.wy -= (dy / dist) * force;
                    }
                }
            }

            uniqueEdges.forEach(edge => {
                graphData.nodes.forEach(node => {
                    let dx = edge.wx - node.x;
                    let dy = edge.wy - node.y;
                    let dist = Math.sqrt(dx*dx + dy*dy);
                    let minDist = R + 34;
                    
                    if (dist < minDist) {
                        if (dist === 0) { dx = 1; dy = 0; dist = 1; }
                        let force = (minDist - dist) * 0.8;
                        edge.wx += (dx / dist) * force;
                        edge.wy += (dy / dist) * force;
                    }
                });
            });

            uniqueEdges.forEach(edge => {
                let nodeU = graphData.nodes.find(n => n.name === edge.u);
                let nodeV = graphData.nodes.find(n => n.name === edge.v);
                let snapped = snapToCurve(edge, edge.wx, edge.wy, nodeU, nodeV);
                edge.wx = snapped.x;
                edge.wy = snapped.y;
            });
        }

        if (!directed) {
            for (let u in graphData.adj) {
                for (let v in graphData.adj[u]) {
                    if (u > v) {
                        let forwardEdge = graphData.adj[v][u];
                        graphData.adj[u][v].wx = forwardEdge.wx;
                        graphData.adj[u][v].wy = forwardEdge.wy;
                        graphData.adj[u][v].curve = forwardEdge.curve;
                    }
                }
            }
        }
    }

    function calculateUserPathSum() {
        let sum = 0;
        for (let i = 0; i < userPath.length - 1; i++) {
            let u = userPath[i];
            let v = userPath[i + 1];
            if (graphData.adj[u] && graphData.adj[u][v] !== undefined) {
                sum += graphData.adj[u][v].weight;
            } else {
                return 0; 
            }
        }
        return sum;
    }

    function getEdgeAt(mx, my) {
        let bestEdge = null;
        let minSegDist = Infinity;
        const R = getNodeRadius();

        for (let u in graphData.adj) {
            for (let v in graphData.adj[u]) {
                if (!directed && u > v) continue;
                let nodeU = graphData.nodes.find(n => n.name === u);
                let nodeV = graphData.nodes.find(n => n.name === v);
                let edge = graphData.adj[u][v];

                let circleDist = Math.sqrt((mx - edge.wx)**2 + (my - edge.wy)**2);
                if (circleDist <= R * 0.6) {
                    return { u, v };
                }

                let d = distToSegment({x: mx, y: my}, nodeU, nodeV);
                if (d < minSegDist) {
                    minSegDist = d;
                    bestEdge = { u, v };
                }
            }
        }

        if (minSegDist <= 15) {
            return bestEdge;
        }
        return null;
    }

    function drawEdge(nodeU, nodeV, color, lineWidth = 2, curveVal = 0) {
        let x1 = nodeU.x, y1 = nodeU.y;
        let x2 = nodeV.x, y2 = nodeV.y;
        const R = getNodeRadius();

        if (!curveVal || Math.abs(curveVal) < 1) {
            let dx = x2 - x1;
            let dy = y2 - y1;
            let dist = Math.sqrt(dx * dx + dy * dy);
            if (dist === 0) return;

            let ux = dx / dist;
            let uy = dy / dist;

            let startX = x1 + R * ux;
            let startY = y1 + R * uy;
            let endX = x2 - R * ux;
            let endY = y2 - R * uy;

            ctx.strokeStyle = color;
            ctx.lineWidth = lineWidth;
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.stroke();

            if (directed) {
                let angle = Math.atan2(uy, ux);
                let arrowLength = currentDifficulty === 'extreme' ? 7 : 10;
                
                if (lineWidth > 2) {
                    arrowLength *= 1.5;
                }
                let arrowWidth = Math.PI / 6;

                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.moveTo(endX, endY);
                ctx.lineTo(
                    endX - arrowLength * Math.cos(angle - arrowWidth),
                    endY - arrowLength * Math.sin(angle - arrowWidth)
                );
                ctx.lineTo(
                    endX - arrowLength * Math.cos(angle + arrowWidth),
                    endY - arrowLength * Math.sin(angle + arrowWidth)
                );
                ctx.closePath();
                ctx.fill();
            }
        } else {
            let mx = (x1 + x2) / 2;
            let my = (y1 + y2) / 2;

            let dx = x2 - x1;
            let dy = y2 - y1;
            let dist = Math.sqrt(dx * dx + dy * dy);
            if (dist === 0) return;

            let nx = -dy / dist;
            let ny = dx / dist;

            let cpx = mx + curveVal * nx;
            let cpy = my + curveVal * ny;

            let dX1 = cpx - x1;
            let dY1 = cpy - y1;
            let dist1 = Math.sqrt(dX1 * dX1 + dY1 * dY1);

            let dX2 = x2 - cpx;
            let dY2 = y2 - cpy;
            let dist2 = Math.sqrt(dX2 * dX2 + dY2 * dY2);

            if (dist1 === 0 || dist2 === 0) return;

            let startX = x1 + R * (dX1 / dist1);
            let startY = y1 + R * (dY1 / dist1);
            let endX = x2 - R * (dX2 / dist2);
            let endY = y2 - R * (dY2 / dist2);

            ctx.strokeStyle = color;
            ctx.lineWidth = lineWidth;
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.quadraticCurveTo(cpx, cpy, endX, endY);
            ctx.stroke();

            if (directed) {
                let angle = Math.atan2(y2 - cpy, x2 - cpx);
                let arrowLength = currentDifficulty === 'extreme' ? 7 : 10;
                
                if (lineWidth > 2) {
                    arrowLength *= 1.5;
                }
                let arrowWidth = Math.PI / 6;

                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.moveTo(endX, endY);
                ctx.lineTo(
                    endX - arrowLength * Math.cos(angle - arrowWidth),
                    endY - arrowLength * Math.sin(angle - arrowWidth)
                );
                ctx.lineTo(
                    endX - arrowLength * Math.cos(angle + arrowWidth),
                    endY - arrowLength * Math.sin(angle + arrowWidth)
                );
                ctx.closePath();
                ctx.fill();
            }
        }
    }

    function drawWeight(wx, wy, weight, color) {
        const R = getNodeRadius();
        const isDark = document.body.classList.contains('dark');
        ctx.beginPath();
        ctx.arc(wx, wy, R * 0.45, 0, 2 * Math.PI);
        ctx.fillStyle = isDark ? '#1e293b' : '#ffffff';
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = isDark ? '#f8fafc' : color;
        ctx.font = `bold ${R * 0.55}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(weight, wx, wy);
    }

    function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const R = getNodeRadius();
        const isAnyHovered = (hoveredEdge !== null);
        const isDark = document.body.classList.contains('dark');

        ctx.globalAlpha = 1.0;

        // --- ШАГ 0: Отрисовка подсветки вершин ПЕРВЫМ слоем ---
        if (isAnyHovered) {
            graphData.nodes.forEach(node => {
                let isNodeHovered = (node.name === hoveredEdge.u || node.name === hoveredEdge.v);
                if (isNodeHovered) {
                    ctx.beginPath();
                    ctx.arc(node.x, node.y, R + 6, 0, 2 * Math.PI);
                    ctx.strokeStyle = graphData.adj[hoveredEdge.u][hoveredEdge.v].color;
                    ctx.lineWidth = 4;
                    ctx.stroke();
                }
            });
        }

        // 1. Рисуем ребра
        for (let u in graphData.adj) {
            for (let v in graphData.adj[u]) {
                if (!directed && u > v) continue; 

                let nodeU = graphData.nodes.find(n => n.name === u);
                let nodeV = graphData.nodes.find(n => n.name === v);
                let edge = graphData.adj[u][v];

                let isUserEdge = false;
                for (let i = 0; i < userPath.length - 1; i++) {
                    if (directed) {
                        if (userPath[i] === u && userPath[i + 1] === v) isUserEdge = true;
                    } else {
                        if ((userPath[i] === u && userPath[i + 1] === v) || (userPath[i] === v && userPath[i + 1] === u)) {
                            isUserEdge = true;
                        }
                    }
                }

                let isOptimalEdge = false;
                if (gameState === 'checked') {
                    const userSum = calculateUserPathSum();
                    const optimalDistance = graphData.solution.distance;
                    const isUserCorrect = (userSum === optimalDistance && userPath[userPath.length - 1] === graphData.endNode);

                    if (isUserCorrect || showOptimalPath) {
                        let optPath = graphData.solution.path;
                        for (let i = 0; i < optPath.length - 1; i++) {
                            if (directed) {
                                if (optPath[i] === u && optPath[i + 1] === v) isOptimalEdge = true;
                            } else {
                                if ((optPath[i] === u && optPath[i + 1] === v) || (optPath[i] === v && optPath[i + 1] === u)) {
                                    isOptimalEdge = true;
                                }
                            }
                        }
                    }
                }

                let isHovered = isAnyHovered && (
                    (hoveredEdge.u === u && hoveredEdge.v === v) ||
                    (!directed && hoveredEdge.u === v && hoveredEdge.v === u)
                );

                let color = edge.color;
                let width = 2;

                // 1. Зеленый путь оптимального решения при проверке
                if (gameState === 'checked' && isOptimalEdge) {
                    color = '#10b981'; 
                    width = 4;
                }

                // 2. Путь, выбранный пользователем (синий в темной теме, черный в светлой)
                if (isUserEdge) {
                    color = isDark ? '#6366f1' : '#000000'; 
                    width = 6;
                }

                if (isHovered) {
                    width = isUserEdge ? 8 : 5; 
                }

                ctx.globalAlpha = isAnyHovered ? (isHovered ? 1.0 : 0.15) : 1.0;

                drawEdge(nodeU, nodeV, color, width, edge.curve);
            }
        }

        // Рисуем веса поверх линий
        for (let u in graphData.adj) {
            for (let v in graphData.adj[u]) {
                if (!directed && u > v) continue;
                let edge = graphData.adj[u][v];

                let isHovered = isAnyHovered && (
                    (hoveredEdge.u === u && hoveredEdge.v === v) ||
                    (!directed && hoveredEdge.u === v && hoveredEdge.v === u)
                );

                ctx.globalAlpha = isAnyHovered ? (isHovered ? 1.0 : 0.15) : 1.0;
                drawWeight(edge.wx, edge.wy, edge.weight, edge.color);
            }
        }

        ctx.globalAlpha = 1.0; 

        // 2. Рисуем вершины
        graphData.nodes.forEach(node => {
            let isNodeHovered = isAnyHovered && (node.name === hoveredEdge.u || node.name === hoveredEdge.v);
            
            ctx.globalAlpha = isAnyHovered ? (isNodeHovered ? 1.0 : 0.25) : 1.0;

            ctx.beginPath();
            ctx.arc(node.x, node.y, R, 0, 2 * Math.PI);

            // Яркое выделение начала (полностью зеленый) и конца (полностью красный)
            if (node.isStart) {
                ctx.fillStyle = '#10b981'; 
            } else if (node.isEnd) {
                ctx.fillStyle = '#ef4444'; 
            } else if (userPath.includes(node.name)) {
                ctx.fillStyle = isDark ? '#312e81' : '#c7d2fe'; 
            } else {
                ctx.fillStyle = isDark ? '#1e293b' : '#f1f5f9'; 
            }

            if (node.isStart) {
                ctx.strokeStyle = '#047857';
                ctx.lineWidth = 4;
            } else if (node.isEnd) {
                ctx.strokeStyle = '#b91c1c';
                ctx.lineWidth = 4;
            } else {
                ctx.strokeStyle = isDark ? '#475569' : '#64748b';
                ctx.lineWidth = 2;
            }

            // Эффект свечения (Outer glow) для начала и конца
            if (node.isStart || node.isEnd) {
                ctx.shadowColor = node.isStart ? '#10b981' : '#ef4444';
                ctx.shadowBlur = 15;
            } else {
                ctx.shadowBlur = 0;
            }

            ctx.fill();
            ctx.stroke();

            ctx.shadowBlur = 0; // Сбрасываем свечение

            ctx.fillStyle = (node.isStart || node.isEnd) ? '#ffffff' : (isDark ? '#f8fafc' : '#0f172a');
            ctx.font = `bold ${R * 0.85}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(node.name, node.x, node.y);
        });

        ctx.globalAlpha = 1.0; 
    }

    function initGame() {
        const modeInput = document.querySelector('input[name="graph-mode"]:checked');
        directed = (modeInput.value === 'directed');

        const requireBackward = chkBackward ? chkBackward.checked : false;

        graphData = window.GraphModule.generateGraph(currentDifficulty, directed, requireBackward);
        assignCoordinates();

        userPath = [graphData.startNode];
        gameState = 'playing';
        hoveredEdge = null;
        showOptimalPath = false;
        btnShowSolution.style.display = 'none';

        feedbackBox.className = 'feedback';
        feedbackBox.innerText = '';
        
        updateUI();
        render();
    }

    function updateUI() {
        if (!graphData) return;
        const sum = calculateUserPathSum();
        const langData = translations[currentLang];
        pathDisplay.innerText = `${langData.pathPrefix}${userPath.join(' -> ')} (${langData.pathSum}: ${sum})`;
    }

    function getNodeAt(x, y) {
        const R = getNodeRadius();
        for (let node of graphData.nodes) {
            let dist = Math.sqrt((x - node.x) ** 2 + (y - node.y) ** 2);
            if (dist <= R + 5) {
                return node.name;
            }
        }
        return null;
    }

    function handleNodeClick(clicked) {
        const index = userPath.indexOf(clicked);

        if (index !== -1) {
            userPath = userPath.slice(0, index + 1);
        } else {
            const last = userPath[userPath.length - 1];
            if (graphData.adj[last] && graphData.adj[last][clicked] !== undefined) {
                userPath.push(clicked);
            }
        }
        updateUI();
        render();
    }

    canvas.addEventListener('mousemove', (e) => {
        if (gameState !== 'playing') {
            if (hoveredEdge !== null) {
                hoveredEdge = null;
                render();
            }
            return;
        }

        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (canvas.width / rect.width);
        const y = (e.clientY - rect.top) * (canvas.height / rect.height);

        let prevHover = hoveredEdge;
        hoveredEdge = getEdgeAt(x, y);

        if (JSON.stringify(prevHover) !== JSON.stringify(hoveredEdge)) {
            render();
        }
    });

    canvas.addEventListener('mouseleave', () => {
        if (hoveredEdge !== null) {
            hoveredEdge = null;
            render();
        }
    });

    canvas.addEventListener('click', (e) => {
        if (gameState !== 'playing') return;

        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (canvas.width / rect.width);
        const y = (e.clientY - rect.top) * (canvas.height / rect.height);

        const clickedNode = getNodeAt(x, y);
        if (clickedNode) {
            handleNodeClick(clickedNode);
        } else {
            // Клик по самому ребру (маршруту)
            const clickedEdge = getEdgeAt(x, y);
            if (clickedEdge) {
                // Если ребро уже пройдено, сбрасываем путь до начальной точки этого ребра
                let edgeInPathIndex = -1;
                for (let i = 0; i < userPath.length - 1; i++) {
                    let pu = userPath[i];
                    let pv = userPath[i + 1];
                    if ((pu === clickedEdge.u && pv === clickedEdge.v) || (!directed && pu === clickedEdge.v && pv === clickedEdge.u)) {
                        edgeInPathIndex = i;
                        break;
                    }
                }

                if (edgeInPathIndex !== -1) {
                    userPath = userPath.slice(0, edgeInPathIndex + 1);
                } else {
                    // Пытаемся пойти по ребру от активной (последней) вершины
                    const last = userPath[userPath.length - 1];
                    if (directed) {
                        if (clickedEdge.u === last) {
                            userPath.push(clickedEdge.v);
                        }
                    } else {
                        if (clickedEdge.u === last) {
                            userPath.push(clickedEdge.v);
                        } else if (clickedEdge.v === last) {
                            userPath.push(clickedEdge.u);
                        }
                    }
                }
                updateUI();
                render();
            }
        }
    });

    diffButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            diffButtons.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentDifficulty = e.target.getAttribute('data-diff');
            
            const chkContainer = document.getElementById('backward-step-container');
            if (currentDifficulty === 'easy') {
                chkContainer.style.display = 'none';
                if (chkBackward) chkBackward.checked = false; 
            } else {
                chkContainer.style.display = 'flex';
            }
            
            initGame();
        });
    });

    if (chkBackward) {
        chkBackward.addEventListener('change', initGame);
    }

    function resetPath() {
        userPath = [graphData.startNode];
        gameState = 'playing';
        showOptimalPath = false;
        btnShowSolution.style.display = 'none';
        feedbackBox.className = 'feedback';
        feedbackBox.innerText = '';
        updateUI();
        render();
    }

    function checkPath() {
        if (gameState !== 'playing') return;

        const finalNode = userPath[userPath.length - 1];
        const langData = translations[currentLang];

        if (finalNode !== graphData.endNode) {
            feedbackBox.className = 'feedback error';
            feedbackBox.innerText = langData.feedbackFinish.replace('{endNode}', graphData.endNode);
            return;
        }

        const userSum = calculateUserPathSum();
        const optimalDistance = graphData.solution.distance;

        gameState = 'checked';
        hoveredEdge = null; 

        if (userSum === optimalDistance) {
            feedbackBox.className = 'feedback success';
            feedbackBox.innerText = langData.feedbackSuccess.replace('{sum}', userSum);
            btnShowSolution.style.display = 'none';
        } else {
            feedbackBox.className = 'feedback error';
            feedbackBox.innerText = langData.feedbackError.replace('{distance}', optimalDistance);
            btnShowSolution.style.display = 'inline-block'; 
        }

        render();
    }

    function showSolution() {
        if (gameState !== 'checked') return;
        
        showOptimalPath = true;
        const optimalDistance = graphData.solution.distance;
        const optimalPath = graphData.solution.path.join(' -> ');
        const langData = translations[currentLang];
        
        feedbackBox.className = 'feedback error';
        feedbackBox.innerHTML = `${langData.feedbackError.replace('{distance}', optimalDistance)}<br><strong>${langData.feedbackOptimalPath}</strong> ${optimalPath}`;
        
        btnShowSolution.style.display = 'none'; 
        render();
    }

    btnResetPath.addEventListener('click', resetPath);
    btnNewGame.addEventListener('click', initGame);
    btnCheck.addEventListener('click', checkPath);
    btnShowSolution.addEventListener('click', showSolution);

    // Функция перевода текстов
    function applyLanguage() {
        const langData = translations[currentLang];
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (langData[key]) {
                el.innerHTML = langData[key];
            }
        });

        updateModeExplanation();

        // Динамические всплывающие подсказки (Title) на кнопках
        btnNewGame.setAttribute('title', langData.tooltipNewGame);
        btnResetPath.setAttribute('title', langData.tooltipReset);
        btnCheck.setAttribute('title', langData.tooltipCheck);
        btnShowSolution.setAttribute('title', langData.tooltipSolution);
        btnTheme.setAttribute('title', langData.tooltipTheme);
        btnFullscreen.setAttribute('title', langData.tooltipFullscreen);

        if (btnExitFullscreenOverlay) {
            btnExitFullscreenOverlay.setAttribute('title', currentLang === 'en' ? 'Exit Fullscreen' : 'Выйти из полноэкранного режима');
        }

        // Кнопка переключения языка на противоположный
        btnLang.innerText = currentLang === 'en' ? '🇷🇺 RU' : '🇬🇧 EN';

        document.title = langData.title;

        const isFullscreen = !!document.fullscreenElement;
        btnFullscreen.innerHTML = isFullscreen 
            ? `📺 ${currentLang === 'en' ? 'Normal Mode' : 'Обычный экран'}`
            : `Fullscreen 📺`;

        updateUI();
    }

    function updateModeExplanation() {
        const langData = translations[currentLang];
        const explanationEl = document.getElementById('mode-explanation');
        const isDirected = document.querySelector('input[name="graph-mode"]:checked').value === 'directed';
        explanationEl.innerHTML = isDirected ? langData.explainDirected : langData.explainUndirected;
    }

    btnLang.addEventListener('click', () => {
        currentLang = currentLang === 'en' ? 'ru' : 'en';
        applyLanguage();
    });

    // Переключатель тем
    btnTheme.addEventListener('click', () => {
        document.body.classList.toggle('dark');
        const isDark = document.body.classList.contains('dark');
        btnTheme.innerText = isDark ? '☀️ Mode' : '🌙 Mode';
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        render();
    });

    // Полноэкранный режим для игровой зоны
    btnFullscreen.addEventListener('click', () => {
        const gameArea = document.querySelector('.game-area');
        if (!document.fullscreenElement) {
            gameArea.requestFullscreen().catch(err => {
                console.error("Error enabling fullscreen:", err);
            });
        } else {
            document.exitFullscreen();
        }
    });

    // Кнопка закрытия внутри полноэкранного режима
    if (btnExitFullscreenOverlay) {
        btnExitFullscreenOverlay.addEventListener('click', () => {
            if (document.fullscreenElement) {
                document.exitFullscreen();
            }
        });
    }

    document.addEventListener('fullscreenchange', () => {
        applyLanguage();
    });

    // Управление с клавиатуры
    document.addEventListener('keydown', (e) => {
        const key = e.key.toLowerCase();
        const upperKey = e.key.toUpperCase();

        // Игра исключительно с клавиатуры: нажатие букв A-Z
        if (gameState === 'playing' && key >= 'a' && key <= 'z') {
            if (graphData && graphData.nodes.some(n => n.name === upperKey)) {
                handleNodeClick(upperKey);
                return;
            }
        }

        // Горячие клавиши управления игрой
        if (key === 'n') {
            initGame();
        } else if (key === 'c') {
            resetPath();
        } else if (e.key === 'Enter') {
            checkPath();
        } else if (key === 's') {
            if (gameState === 'checked' && btnShowSolution.style.display !== 'none') {
                showSolution();
            }
        }
    });

    document.querySelectorAll('input[name="graph-mode"]').forEach(radio => {
        radio.addEventListener('change', () => {
            updateModeExplanation();
            initGame();
        });
    });

    // Загрузка темы из памяти
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark');
        btnTheme.innerText = '☀️ Mode';
    } else {
        btnTheme.innerText = '🌙 Mode';
    }

    applyLanguage();
    initGame();
});