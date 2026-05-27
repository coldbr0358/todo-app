/**
 * 할 일 목록 앱 (Todo List App)
 * - localStorage 영속화
 * - 추가 / 완료 토글 / 삭제 / 필터 (전체 / 진행 중 / 완료)
 */

(function () {
  'use strict';

  // ===== 상태 =====
  let todos = [];
  let currentFilter = 'all'; // 'all' | 'active' | 'completed'

  // ===== DOM 참조 =====
  const todoInput      = document.getElementById('todo-input');
  const addBtn         = document.getElementById('add-btn');
  const todoList       = document.getElementById('todo-list');
  const emptyMsg       = document.getElementById('empty-msg');
  const counter        = document.getElementById('counter');
  const filterBtns     = document.querySelectorAll('.filter-btn');
  const clearCompBtn   = document.getElementById('clear-completed-btn');

  // ===== localStorage =====
  const STORAGE_KEY = 'todos_v1';

  function loadTodos() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      todos = raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.warn('할 일 데이터를 불러오지 못했습니다:', e);
      todos = [];
    }
  }

  function saveTodos() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
    } catch (e) {
      console.warn('할 일 데이터를 저장하지 못했습니다:', e);
    }
  }

  // ===== CRUD =====
  function addTodo(text) {
    const trimmed = text.trim();
    if (!trimmed) return false;

    const todo = {
      id: Date.now() + Math.random(), // 동시 추가 대비
      text: trimmed,
      completed: false,
      createdAt: Date.now(),
    };

    todos.unshift(todo); // 최신 항목이 위로
    saveTodos();
    render();
    return true;
  }

  function toggleTodo(id) {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;
    todo.completed = !todo.completed;
    saveTodos();
    render();
  }

  function deleteTodo(id, itemEl) {
    if (itemEl) {
      itemEl.classList.add('removing');
      // 애니메이션 후 실제 삭제
      itemEl.addEventListener('animationend', () => {
        todos = todos.filter(t => t.id !== id);
        saveTodos();
        render();
      }, { once: true });
    } else {
      todos = todos.filter(t => t.id !== id);
      saveTodos();
      render();
    }
  }

  function clearCompleted() {
    todos = todos.filter(t => !t.completed);
    saveTodos();
    render();
  }

  // ===== 필터 =====
  function setFilter(filter) {
    currentFilter = filter;

    filterBtns.forEach(btn => {
      const isActive = btn.dataset.filter === filter;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    render();
  }

  function getFilteredTodos() {
    switch (currentFilter) {
      case 'active':    return todos.filter(t => !t.completed);
      case 'completed': return todos.filter(t =>  t.completed);
      default:          return todos;
    }
  }

  // ===== 렌더링 =====
  function render() {
    const filtered = getFilteredTodos();

    todoList.innerHTML = '';

    if (filtered.length === 0) {
      emptyMsg.hidden = false;
    } else {
      emptyMsg.hidden = true;
      filtered.forEach(todo => {
        todoList.appendChild(createTodoItem(todo));
      });
    }

    updateCounter();
  }

  function createTodoItem(todo) {
    const li = document.createElement('li');
    li.className = 'todo-item' + (todo.completed ? ' completed' : '');
    li.dataset.id = todo.id;

    // 체크박스
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'todo-checkbox';
    checkbox.checked = todo.completed;
    checkbox.setAttribute('aria-label', `${todo.text} 완료 토글`);
    checkbox.addEventListener('change', () => toggleTodo(todo.id));

    // 텍스트
    const span = document.createElement('span');
    span.className = 'todo-text';
    span.textContent = todo.text;

    // 삭제 버튼
    const delBtn = document.createElement('button');
    delBtn.className = 'delete-btn';
    delBtn.textContent = '✕';
    delBtn.setAttribute('aria-label', `${todo.text} 삭제`);
    delBtn.addEventListener('click', () => deleteTodo(todo.id, li));

    li.appendChild(checkbox);
    li.appendChild(span);
    li.appendChild(delBtn);

    return li;
  }

  function updateCounter() {
    const activeCount = todos.filter(t => !t.completed).length;
    counter.textContent = `남은 할 일: ${activeCount}개`;
  }

  // ===== 이벤트 바인딩 =====
  addBtn.addEventListener('click', () => {
    const ok = addTodo(todoInput.value);
    if (ok) todoInput.value = '';
  });

  todoInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const ok = addTodo(todoInput.value);
      if (ok) todoInput.value = '';
    }
  });

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => setFilter(btn.dataset.filter));
  });

  clearCompBtn.addEventListener('click', clearCompleted);

  // ===== 초기화 =====
  loadTodos();
  render();

})();
