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
        if (data.player.id !== playerId) {
          players[data.player.id] = new Player(data.player.state);
          gameEngine.addPlayer(players[data.player.id]);
        }
        break;
      case 'player_setup':
        thisPlayer = players[playerId] = new Player(data.player.state);
        thisPlayer.onFinishedMoving(() => {
          App.game.sendAction({ type: 'player_finished_moving' });
        })
        gameEngine.addPlayer(thisPlayer);
        break;
      case 'other_players':
        console.log(data.players);
        data.players.forEach(p => {
          players[p.id] = new Player(p.state);
          gameEngine.addPlayer(players[p.id]);
        });
        break;
      case 'player_left':
        gameEngine.removePlayer(players[data.player.id]);
        delete players[data.player.id];
        break;
      case 'player_action':
        switch(data.action.type) {
        case 'player_clicked':
          players[data.player.id].moveTo(data.action.point)
          break;
        case 'player_finished_moving':
          players[data.player.id].position.set(data.player.state.x, data.player.state.y, 0.0);
        default:
          break;
        }
        break;
      default:
        break;
      }
    },

    sendAction(action) {
      this.perform('send_action', { player_action: action, state: thisPlayer.getState() });
    }
  });

  gameEngine.onMouseClicked(point => {
    App.game.sendAction({
      type: 'player_clicked',
      point: { x: point.x, y: point.y }
    });
  });
});
