const App = require('../cable');

const THREE = require('three');
const GameEngine = require('./game_engine');
const Player = require('./player');
const HomingMissile = require('./homingMissile');

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

  let timeOffset = 0.0;

  function getTimePassed(startTime) {
    const thisTime = +(new Date());
    const thisStartTime = (startTime * 1000.0) - timeOffset;
    return thisTime - thisStartTime;
  }

  const tmpVector3 = new THREE.Vector3();

  function performAction(action, dataPlayer, player) {
    switch(action.type) {
    case 'player_clicked':
      player.moveTo(action.point, getTimePassed(dataPlayer.time));
      break;
    case 'player_finished_moving':
      player.position.set(dataPlayer.state.x, dataPlayer.state.y, 0.0);
      break;
    case 'target_player': {
      console.log(players);
      const targetPlayer = players[action.target_id];
      tmpVector3.set(0, 0, 0.5).add(player.position);
      const projectile = new HomingMissile(tmpVector3, targetPlayer);
      projectile.targetObject(targetPlayer, getTimePassed(dataPlayer.time));
      gameEngine.addProjectile(projectile);
      projectile.onFinishedMoving(() => {
        gameEngine.removeProjectile(projectile);
      });
      break;
    }
    default:
      break;
    }
  }

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
          players[data.player.id] = new Player(data.player.id, data.player.state);
          gameEngine.addPlayer(players[data.player.id]);
        }
        break;
      case 'player_setup':
        thisPlayer = players[playerId] = new Player(data.player.id, data.player.state);
        const thisTime = +(new Date());
        timeOffset = (data.player.time * 1000.0) - thisTime;
        thisPlayer.onFinishedMoving(() => {
          App.game.sendAction({ type: 'player_finished_moving' });
        })
        gameEngine.addPlayer(thisPlayer);
        gameEngine.followPlayer(thisPlayer);
        break;
      case 'other_players':
        data.players.forEach(p => {
          players[p.id] = new Player(p.id, p.state);
          gameEngine.addPlayer(players[p.id]);

          if (p.action) {
            performAction(p.action, p, players[p.id]);
          }
        });
        break;
      case 'player_left':
        gameEngine.removePlayer(players[data.player.id]);
        delete players[data.player.id];
        break;
      case 'player_action':
        performAction(data.action, data.player, players[data.player.id]);
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

  gameEngine.onPlayerClicked(player => {
    App.game.sendAction({
      type: 'target_player',
      point: { x: thisPlayer.position.x, y: thisPlayer.position.y },
      target_id: player.playerId
    });
  });
});
