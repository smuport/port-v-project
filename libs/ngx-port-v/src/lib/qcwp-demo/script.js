document.addEventListener('DOMContentLoaded', function() {
    // 全局变量
    const craneCountInput = document.getElementById('crane-count');
    const generateCranesBtn = document.getElementById('generate-cranes');
    const craneList = document.getElementById('crane-list');
    const taskInfo = document.getElementById('task-info');
    const assignedBlocks = document.getElementById('assigned-blocks');
    const ganttChart = document.getElementById('gantt-chart');
    const ctx = ganttChart.getContext('2d');
    
    // 任务块容器
    const taskBlocksDeckUnload = document.getElementById('task-blocks-deck-unload');
    const taskBlocksDeckLoad = document.getElementById('task-blocks-deck-load');
    const taskBlocksHoldUnload = document.getElementById('task-blocks-hold-unload');
    const taskBlocksHoldLoad = document.getElementById('task-blocks-hold-load');
    
    // 设置画布大小
    ganttChart.width = 1200;
    ganttChart.height = 6000;
    
    // 数据存储
    let cranes = [];
    let selectedCrane = null;
    let tasks = [];
    let assignedTasks = {};
    
    // 常量
    // 常量部分添加颜色数组
    const UNIT_TIME = 2; // 单位箱子的作业时间（分钟）
    const BAY_WIDTH = 50; // 甘特图中贝位的宽度
    const TIME_HEIGHT = 10; // 甘特图中每分钟的高度
    const TASK_WIDTH = BAY_WIDTH * 1; // 任务块的宽度
    const LEFT_PADDING = BAY_WIDTH * 2; // 左侧预留空间，相当于2个小贝的宽度
    const CRANE_COLORS = ['#3498db', '#2ecc71', '#e74c3c', '#f39c12', '#9b59b6', '#1abc9c']; // 岸桥颜色

    // 初始化示例任务
    function initTasks() {
        // tasks = [
        //     { id: 1, bayNumber: 1, location: '舱内', operation: '装船', containerCount: 20 },
        //     { id: 2, bayNumber: 3, location: '舱面', operation: '装船', containerCount: 15 },
        //     { id: 3, bayNumber: 5, location: '舱内', operation: '卸船', containerCount: 25 },
        //     { id: 4, bayNumber: 7, location: '舱面', operation: '卸船', containerCount: 10 },
        //     { id: 5, bayNumber: 9, location: '舱内', operation: '装船', containerCount: 30 },
        //     { id: 6, bayNumber: 11, location: '舱面', operation: '装船', containerCount: 18 },
        //     { id: 7, bayNumber: 13, location: '舱内', operation: '卸船', containerCount: 22 },
        //     { id: 8, bayNumber: 15, location: '舱面', operation: '卸船', containerCount: 12 },
        //     { id: 9, bayNumber: 17, location: '舱内', operation: '装船', containerCount: 28 },
        //     { id: 10, bayNumber: 19, location: '舱面', operation: '装船', containerCount: 16 },
        //     { id: 11, bayNumber: 21, location: '舱内', operation: '卸船', containerCount: 24 },
        //     { id: 12, bayNumber: 23, location: '舱面', operation: '卸船', containerCount: 14 }
        // ];
        tasks = [
            { id: 1, bayNumber: 2, location: '舱面', operation: '装船', containerCount: 5 },
            { id: 2, bayNumber: 6, location: '舱面', operation: '装船', containerCount: 27 },
            { id: 3, bayNumber: 6, location: '舱内', operation: '装船', containerCount: 40 },
            { id: 4, bayNumber: 6, location: '舱面', operation: '卸船', containerCount: 24 },
            { id: 5, bayNumber: 6, location: '舱内', operation: '卸船', containerCount: 24 },
            { id: 6, bayNumber: 14, location: '舱面', operation: '装船', containerCount: 14 },
            { id: 7, bayNumber: 14, location: '舱内', operation: '卸船', containerCount: 24 },
            { id: 8, bayNumber: 14, location: '舱面', operation: '卸船', containerCount: 24 },
            { id: 9, bayNumber: 14, location: '舱内', operation: '装船', containerCount: 33 },
            { id: 10, bayNumber: 18, location: '舱面', operation: '装船', containerCount: 32 },
            { id: 11, bayNumber: 18, location: '舱内', operation: '装船', containerCount: 65 },
            { id: 12, bayNumber: 22, location: '舱面', operation: '装船', containerCount: 24 },
            { id: 13, bayNumber: 26, location: '舱面', operation: '装船', containerCount: 24 },
            { id: 14, bayNumber: 34, location: '舱面', operation: '装船', containerCount: 11 },
            { id: 15, bayNumber: 34, location: '舱面', operation: '卸船', containerCount: 24 },
            { id: 16, bayNumber: 34, location: '舱内', operation: '装船', containerCount: 33 },
            { id: 17, bayNumber: 34, location: '舱内', operation: '卸船', containerCount: 24 },
            { id: 18, bayNumber: 38, location: '舱面', operation: '装船', containerCount: 22 },
            { id: 18, bayNumber: 38, location: '舱面', operation: '卸船', containerCount: 24 },
            { id: 18, bayNumber: 42, location: '舱面', operation: '装船', containerCount: 24 },
            { id: 18, bayNumber: 42, location: '舱面', operation: '卸船', containerCount: 25 },
        ];
        renderTaskBlocks();
    }
    
    // 生成岸桥
    generateCranesBtn.addEventListener('click', function() {
        const count = parseInt(craneCountInput.value);
        if (count > 0) {
            cranes = [];
            for (let i = 1; i <= count; i++) {
                cranes.push({ id: i, name: `岸桥 ${i}` });
            }
            renderCranes();
            selectedCrane = null;
            taskInfo.innerHTML = '<p>请选择一台岸桥</p>';
            assignedBlocks.innerHTML = '';
            assignedTasks = {};
            drawGanttChart();
        }
    });
    
    // 渲染岸桥列表
    function renderCranes() {
        craneList.innerHTML = '';
        cranes.forEach(crane => {
            const craneItem = document.createElement('div');
            craneItem.className = 'crane-item';
            if (selectedCrane && selectedCrane.id === crane.id) {
                craneItem.classList.add('selected');
            }
            
            // 为每个岸桥设置对应的颜色
            const colorIndex = (crane.id - 1) % CRANE_COLORS.length;
            const color = CRANE_COLORS[colorIndex];
            craneItem.style.backgroundColor = color;
            craneItem.style.color = '#fff';
            craneItem.style.borderColor = color;
            
            craneItem.textContent = crane.name;
            craneItem.dataset.id = crane.id;
            craneItem.addEventListener('click', function() {
                selectCrane(crane);
            });
            craneList.appendChild(craneItem);
        });
    }
    
    // 选择岸桥
    // 添加自动安排按钮引用
    const autoAssignBtn = document.getElementById('auto-assign-btn');
    
    function selectCrane(crane) {
        selectedCrane = crane;
        renderCranes();
        taskInfo.innerHTML = `<p>当前选择: ${crane.name}</p>`;
        renderAssignedTasks();
    }
    
    // 渲染可用任务块
    function renderTaskBlocks() {
        // 清空所有任务容器
        taskBlocksDeckUnload.innerHTML = '';
        taskBlocksDeckLoad.innerHTML = '';
        taskBlocksHoldUnload.innerHTML = '';
        taskBlocksHoldLoad.innerHTML = '';
        
        // 按贝位号排序任务
        tasks.sort((a, b) => a.bayNumber - b.bayNumber);
        
        // 获取所有贝位号
        const allBayNumbers = [2, 6, 10, 14, 18, 22, 26, 30, 34, 38, 42];
        // for (const task of tasks) {
        //     if (!allBayNumbers.includes(task.bayNumber)) {
        //         allBayNumbers.push(task.bayNumber);
        //     }
        // }
        
        // 创建四种类型的贝位任务映射
        const deckUnloadTasks = {};
        const deckLoadTasks = {};
        const holdUnloadTasks = {};
        const holdLoadTasks = {};
        
        // 将任务按类型和贝位分类
        tasks.forEach(task => {
            if (task.location === '舱面' && task.operation === '卸船') {
                deckUnloadTasks[task.bayNumber] = task;
            } else if (task.location === '舱面' && task.operation === '装船') {
                deckLoadTasks[task.bayNumber] = task;
            } else if (task.location === '舱内' && task.operation === '卸船') {
                holdUnloadTasks[task.bayNumber] = task;
            } else if (task.location === '舱内' && task.operation === '装船') {
                holdLoadTasks[task.bayNumber] = task;
            }
        });
        
        // 为每个贝位创建任务块或占位块
        allBayNumbers.forEach(bayNumber => {
            // 舱面卸船
            createTaskOrPlaceholder(bayNumber, deckUnloadTasks[bayNumber], taskBlocksDeckUnload);
            
            // 舱面装船
            createTaskOrPlaceholder(bayNumber, deckLoadTasks[bayNumber], taskBlocksDeckLoad);
            
            // 舱内卸船
            createTaskOrPlaceholder(bayNumber, holdUnloadTasks[bayNumber], taskBlocksHoldUnload);
            
            // 舱内装船
            createTaskOrPlaceholder(bayNumber, holdLoadTasks[bayNumber], taskBlocksHoldLoad);
        });
    }
    
    // 创建任务块或占位块
    function createTaskOrPlaceholder(bayNumber, task, container) {
        const taskBlock = document.createElement('div');
        taskBlock.style.boxSizing = 'border-box';
        if (bayNumber % 2 === 0) {
            taskBlock.style.width = `${BAY_WIDTH * 2}px`
        } else {
            taskBlock.style.width = `${BAY_WIDTH}px`
        }
        
        if (task) {
            // 如果有任务，创建正常任务块
            taskBlock.className = 'task-block';
            
            // 检查任务是否已被分配给某个岸桥
            let assignedCraneId = null;
            for (const craneId in assignedTasks) {
                if (assignedTasks[craneId].some(t => t.id === task.id)) {
                    assignedCraneId = craneId;
                    break;
                }
            }
            
            // 如果任务已被分配，使用对应岸桥的颜色
            if (assignedCraneId) {
                const colorIndex = (parseInt(assignedCraneId) - 1) % CRANE_COLORS.length;
                const color = CRANE_COLORS[colorIndex];
                taskBlock.style.backgroundColor = color;
                taskBlock.style.borderColor = color;
                taskBlock.style.color = '#fff';
            }
            
            taskBlock.innerHTML = `
                <div>贝位: ${task.bayNumber}</div>
                <div>箱量: ${task.containerCount}</div>
            `;
            taskBlock.dataset.id = task.id;
            taskBlock.addEventListener('click', function() {
                if (selectedCrane) {
                    assignTaskToCrane(task);
                } else {
                    alert('请先选择一台岸桥');
                }
            });
        } else {
            // 如果没有任务，创建占位块
            taskBlock.className = 'task-block placeholder';
            taskBlock.innerHTML = `
                <div>贝位: ${bayNumber}</div>
                <div>无任务</div>
            `;
        }
        
        // 计算贝位位置，加上左侧预留空间
        const x = LEFT_PADDING + ((bayNumber - 1) / 2) * BAY_WIDTH;
        
        // 将任务块添加到对应容器
        container.appendChild(taskBlock);
    }
    
    // 分配任务给岸桥
    function assignTaskToCrane(task) {
        if (!assignedTasks[selectedCrane.id]) {
            assignedTasks[selectedCrane.id] = [];
        }
        
        // 检查任务是否已分配给任何岸桥
        for (const craneId in assignedTasks) {
            const taskIndex = assignedTasks[craneId].findIndex(t => t.id === task.id);
            if (taskIndex !== -1) {
                // 如果任务已分配给当前选中的岸桥，则不做任何操作
                if (craneId === selectedCrane.id.toString()) {
                    return;
                }
                // 如果任务已分配给其他岸桥，则从其他岸桥中移除
                assignedTasks[craneId].splice(taskIndex, 1);
            }
        }
        
        assignedTasks[selectedCrane.id].push(task);
        renderAssignedTasks();
        renderTaskBlocks(); // 重新渲染任务块以更新颜色
        drawGanttChart();
    }
    
    // 移除任务
    function removeTask(index) {
        assignedTasks[selectedCrane.id].splice(index, 1);
        renderAssignedTasks();
        renderTaskBlocks(); // 重新渲染任务块以更新颜色
        drawGanttChart();
    }
    
    // 渲染已分配任务
    function renderAssignedTasks() {
        assignedBlocks.innerHTML = '';
        if (!selectedCrane || !assignedTasks[selectedCrane.id]) return;
        
        // 获取当前岸桥的颜色
        const colorIndex = (selectedCrane.id - 1) % CRANE_COLORS.length;
        const color = CRANE_COLORS[colorIndex];
        
        assignedTasks[selectedCrane.id].forEach((task, index) => {
            const taskBlock = document.createElement('div');
            taskBlock.className = 'task-block assigned';
            
            // 设置任务块的背景色为岸桥对应的颜色
            taskBlock.style.backgroundColor = color;
            taskBlock.style.borderColor = color;
            taskBlock.style.color = '#fff';
            
            taskBlock.innerHTML = `
                <div>顺序: ${index + 1}</div>
                <div>贝位: ${task.bayNumber}</div>
                <div>位置: ${task.location}</div>
                <div>操作: ${task.operation}</div>
                <div>箱量: ${task.containerCount}</div>
            `;
            
            // 添加上移按钮
            if (index > 0) {
                const upBtn = document.createElement('button');
                upBtn.textContent = '上移';
                upBtn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    moveTask(index, index - 1);
                });
                taskBlock.appendChild(upBtn);
            }
            
            // 添加下移按钮
            if (index < assignedTasks[selectedCrane.id].length - 1) {
                const downBtn = document.createElement('button');
                downBtn.textContent = '下移';
                downBtn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    moveTask(index, index + 1);
                });
                taskBlock.appendChild(downBtn);
            }
            
            // 添加删除按钮
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = '删除';
            deleteBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                removeTask(index);
            });
            taskBlock.appendChild(deleteBtn);
            
            assignedBlocks.appendChild(taskBlock);
        });
    }
    
    // 移动任务顺序
    function moveTask(fromIndex, toIndex) {
        const tasks = assignedTasks[selectedCrane.id];
        const task = tasks.splice(fromIndex, 1)[0];
        tasks.splice(toIndex, 0, task);
        renderAssignedTasks();
        drawGanttChart();
    }
    
    // 绘制甘特图
    function drawGanttChart() {
        // 清空画布
        ctx.clearRect(0, 0, ganttChart.width, ganttChart.height);
        
        // 绘制背景网格和坐标
        drawGrid();
        
        // 绘制每个岸桥的任务
        for (const craneId in assignedTasks) {
            const tasks = assignedTasks[craneId];
            let currentTime = 0;
            
            // 为每个岸桥选择一个颜色
            const colorIndex = (parseInt(craneId) - 1) % CRANE_COLORS.length;
            const color = CRANE_COLORS[colorIndex];
            
            tasks.forEach(task => {
                // 计算任务在甘特图中的位置，加上左侧预留空间
                const x = LEFT_PADDING + ((task.bayNumber - 1) / 2) * BAY_WIDTH;
                const y = currentTime * TIME_HEIGHT;
                
                // 计算任务的高度（时间）
                const taskTime = task.containerCount * UNIT_TIME;
                const height = taskTime * TIME_HEIGHT;
                
                // 绘制任务块
                ctx.fillStyle = color;
                ctx.fillRect(x, y, TASK_WIDTH, height);
                
                // 绘制任务边框
                ctx.strokeStyle = '#333';
                ctx.lineWidth = 1;
                ctx.strokeRect(x, y, TASK_WIDTH, height);
                
                // 绘制任务信息
                ctx.fillStyle = '#fff';
                ctx.font = '12px Arial';
                ctx.fillText(`岸桥 ${craneId}`, x + 5, y + 15);
                ctx.fillText(`贝位: ${task.bayNumber}`, x + 5, y + 30);
                ctx.fillText(`${task.location} ${task.operation}`, x + 5, y + 45);
                ctx.fillText(`箱量: ${task.containerCount}`, x + 5, y + 60);
                ctx.fillText(`时间: ${taskTime}分钟`, x + 5, y + 75);
                
                // 更新当前时间
                currentTime += taskTime;
            });
        }
    }
    
    // 绘制网格和坐标
    function drawGrid() {
        // 设置网格样式
        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = 0.5;
        
        // 绘制水平时间线
        for (let i = 0; i <= 200; i++) {
            const y = i * TIME_HEIGHT * 10; // 每10分钟一条主线
            
            // 绘制主时间线
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(ganttChart.width, y);
            
            // 主时间线加粗
            ctx.lineWidth = 1;
            ctx.stroke();
            
            // 标记时间
            ctx.fillStyle = '#333';
            ctx.font = '10px Arial';
            ctx.fillText(`${i * 10}分钟`, 5, y - 5);
            
            // 绘制次要时间线
            ctx.lineWidth = 0.5;
            for (let j = 1; j < 10; j++) {
                const minorY = y + j * TIME_HEIGHT;
                ctx.beginPath();
                ctx.moveTo(0, minorY);
                ctx.lineTo(ganttChart.width, minorY);
                ctx.stroke();
            }
        }
        
        // 绘制垂直贝位线
        let maxBayNumber = Math.max(...tasks.map(task => task.bayNumber), 25);
        maxBayNumber = maxBayNumber + (1 - maxBayNumber % 2)
        // 只绘制奇数贝位线，因为贝位号只有奇数
        for (let i = 1; i <= maxBayNumber ; i += 2) {
            // 计算贝位位置，加上左侧预留空间
            const x = LEFT_PADDING + ((i - 1) / 2) * BAY_WIDTH;
            
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, ganttChart.height);
            
            // 贝位线加粗
            ctx.lineWidth = 1;
            ctx.stroke();
            
            // 标记贝位号
            ctx.fillStyle = '#333';
            ctx.font = '10px Arial';
            ctx.fillText(`贝位 ${i}`, x + 5, 15);
        }
        
        // 绘制左侧预留区域的边界线
        ctx.beginPath();
        ctx.moveTo(LEFT_PADDING, 0);
        ctx.lineTo(LEFT_PADDING, ganttChart.height);
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#999';
        ctx.stroke();
    }
    
    // 调整甘特图大小
    function resizeGanttChart() {
        const container = document.getElementById('gantt-container');
        ganttChart.width = container.clientWidth - 20;
        ganttChart.height = container.clientHeight - 20;
        drawGanttChart();
    }
    
    // 监听窗口大小变化
    // window.addEventListener('resize', resizeGanttChart);
    
    // 自动安排岸桥分路计划
    autoAssignBtn.addEventListener('click', function() {
        if (cranes.length === 0) {
            alert('请先生成岸桥');
            return;
        }
        
        // 清空当前分配
        assignedTasks = {};
        
        // 调用算法自动分配任务
        const assignment = autoAssignTasks(tasks, cranes.length, UNIT_TIME, 0.5);
        
        // 更新分配结果
        assignedTasks = assignment;
        
        // 更新UI
        renderTaskBlocks();
        renderAssignedTasks();
        drawGanttChart();
        
        // 计算并显示总完成时间
        let maxCompletionTime = 0;
        for (const craneId in assignedTasks) {
            const craneTasks = assignedTasks[craneId];
            if (craneTasks.length > 0) {
                let craneTime = 0;
                let currentBay = craneTasks[0].bayNumber;
                
                for (const task of craneTasks) {
                    // 添加移动时间
                    if (craneTime > 0) {
                        craneTime += Math.abs(currentBay - task.bayNumber) * 0.5; // 0.5分钟/贝位
                    }
                    // 添加作业时间
                    craneTime += task.containerCount * UNIT_TIME;
                    currentBay = task.bayNumber;
                }
                
                if (craneTime > maxCompletionTime) {
                    maxCompletionTime = craneTime;
                }
            }
        }
        
        alert(`自动安排完成！预计总完成时间: ${maxCompletionTime.toFixed(1)} 分钟`);
    });
    
    // 初始化应用
    function init() {
        // 初始化示例任务
        initTasks();
        
        // 默认生成一台岸桥
        craneCountInput.value = 1;
        generateCranesBtn.click();
        
        // 调整甘特图大小
        // resizeGanttChart();
    }
    
    // 启动应用
    init();
});