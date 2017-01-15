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
  const playerId = canvas.data('player-id');

  const gameEngine = new GameEngine(canvas.get(0));

  gameEngine.render();

  const players = {};
  let thisPlayer;

  App.game = App.cable.subscriptions.create({
    channel: 'GamesChannel',
    game_id: gameId
  }, {
    connected() {
    },

    disconnected() {
    },

    received(data) {
      console.log(data);
      switch(data.type) {
      case 'player_joined':
        players[data.player.id] = new Player();
        if (data.player.id === playerId) {
          thisPlayer = players[data.player.id];
        }
        gameEngine.addPlayer(players[data.player.id]);
        break;
      case 'player_left':
        gameEngine.removePlayer(players[data.player.id]);
        break;
      case 'player_action':
        break;
      default:
        break;
      }
    },

    sendAction(action) {
      return this.perform('send_action', { action });
    }
  });
});
