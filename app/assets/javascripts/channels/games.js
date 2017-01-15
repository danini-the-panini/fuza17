const App = require('../cable');

const GameEngine = require('./game_engine');
const Player = require('./player');

$(document).on('turbolinks:load', () => {
  if (App.game) {
    App.game.unsubscribe();
  }

  const canvas = $('#game-canvas');

  if (canvas.length === 0) return;

  const gameId = canvas.data('game-id');

  const gameEngine = new GameEngine(canvas.get(0));

  gameEngine.render();

  let player;

  App.game = App.cable.subscriptions.create({
    channel: 'GamesChannel',
    game_id: gameId
  }, {
    connected() {
      player = new Player();
      gameEngine.addPlayer(player);
    },

    disconnected() {
    },

    received(data) {
      console.log(data);
    },

    sendAction(action) {
      return this.perform('send_action', { gameId, action });
    }
  });
});
