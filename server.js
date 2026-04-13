const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

// Состояние игры
let gameState = {
  active: false,       // раунд активен?
  winner: null,        // номер команды-победителя
  teams: {}            // подключённые команды: { socketId: teamNumber }
};

io.on('connection', (socket) => {
  console.log('Подключение:', socket.id);

  // Команда выбирает номер
  socket.on('join-team', (teamNumber) => {
    gameState.teams[socket.id] = teamNumber;
    socket.join('teams');
    console.log(`Команда ${teamNumber} подключилась`);
    // Отправить текущее состояние новой команде
    socket.emit('game-state', {
      active: gameState.active,
      winner: gameState.winner
    });
  });

  // Ведущий подключается
  socket.on('join-host', () => {
    socket.join('host');
    console.log('Ведущий подключился');
    socket.emit('game-state', {
      active: gameState.active,
      winner: gameState.winner,
      teamsCount: Object.keys(gameState.teams).length
    });
  });

  // Ведущий нажимает "Старт"
  socket.on('start-round', () => {
    gameState.active = true;
    gameState.winner = null;
    console.log('--- Раунд начался! ---');
    io.emit('round-started');
  });

  // Команда нажимает кнопку
  socket.on('buzz', () => {
    if (!gameState.active) return;
    if (gameState.winner !== null) return;

    const teamNumber = gameState.teams[socket.id];
    if (!teamNumber) return;

    gameState.winner = teamNumber;
    gameState.active = false;
    console.log(`Команда ${teamNumber} нажала первой!`);
    io.emit('team-won', teamNumber);
  });

  // Ведущий сбрасывает раунд
  socket.on('reset-round', () => {
    gameState.active = false;
    gameState.winner = null;
    console.log('--- Раунд сброшен ---');
    io.emit('round-reset');
  });

  // Отключение
  socket.on('disconnect', () => {
    const team = gameState.teams[socket.id];
    if (team) {
      console.log(`Команда ${team} отключилась`);
      delete gameState.teams[socket.id];
    }
  });
});

const PORT = 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Сервер запущен: http://localhost:${PORT}`);
  console.log(`Команды: http://<IP>:${PORT}/team.html`);
  console.log(`Ведущий: http://<IP>:${PORT}/host.html`);
});
