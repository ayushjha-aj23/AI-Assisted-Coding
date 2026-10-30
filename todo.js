// todo app with add, remove, and list functionality
const todos = [];

function addTodo(todo) {
  todos.push(todo);
  console.log(`Added todo: ${todo}`);
}

function removeTodo(index) {
    if (index >= 0 && index < todos.length) {
        const removed = todos.splice(index, 1);
        console.log(`Removed todo: ${removed}`);
    } else {
        console.log('Invalid index');
    }       
}

async function listTodos() {
    await new Promise(resolve => setTimeout(resolve, 5000));
    console.log('Current todos:');
    todos.forEach((todo, index) => {
        console.log(`${index}: ${todo}`);
    });
}

// Example usage:
async function main() {
    addTodo('Learn JavaScript');
    addTodo('Build a todo app');
    await listTodos();
    removeTodo(0);
    await listTodos();
}

main();