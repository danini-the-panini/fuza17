const App = require('../cable');

const THREE = require('three');
const GameEngine = require('./game_engine');
const Player = require('./player');
const HomingMissile = require('./homingMissile');

$(document).on('turbolinks:load', () => {
  if (App.game) {
    App.game.unsubscribe();
  }

  const deathOverlay = $('#death-overlay');
  const deathCounter = $('#death-counter');
  const deathText = $('#death-text');
  const scoreCardBody = $('#score-card tbody');

  const gameMenu = $('#menu');
  const leaveButton = $('#leave-button');
  const resumeButton = $('#resume-button');

  const menuButton = $('#menu-button');

  const canvas = $('#game-canvas');

  if (canvas.length === 0) return;

  const gameId = canvas.data('game-id');
  const playerId = canvas.data('player-id');

  const gameEngine = new GameEngine(canvas.get(0));

  gameEngine.render();

  const possibleHits = {}

  const players = {};
  let thisPlayer;
  let navPath;
  let visualNavPath;

  let timeOffset = 0.0;

  function getTimePassed(startTime) {
    const thisTime = +(new Date());
    const thisStartTime = (startTime * 1000.0) - timeOffset;
    return thisTime - thisStartTime;
  }

  let isSetUp = false;
  let otherPlayersSetUp = false;

  function updateScoreCard() {
    let html = '';
    for (let id in players) {
      if (!players.hasOwnProperty(id)) return;
      const player = players[id];
      html += `<tr><td>${player.name}</td><td>${player.state.kills}</td><td>${player.state.deaths}</td></tr>`;
    }
    scoreCardBody.html(html);
  }

  let spawnTime;

  function respawnLater(player) {
    setTimeout(() => {
      if (!player.dead) return;
      const timePassed = getTimePassed(player.state.death_time);
      deathCounter.text(Math.round((spawnTime - timePassed) / 1000));
      App.game.sendAction({
        type: 'player_respawn',
        player_id: player.playerId
      });
      respawnLater(player);
    }, 1000);
  }

  function navigateToNextPoint() {
    const nextPoint = navPath.shift();
    if (!nextPoint) {
      // gameEngine.scene.remove(visualNavPath);
      App.game.sendAction({
        type: 'player_finished_moving',
        position: { x: thisPlayer.position.x, y: thisPlayer.position.y }
      });
      return;
    }
    App.game.sendAction({
      type: 'player_started_moving',
      position: { x: thisPlayer.position.x, y: thisPlayer.position.y },
      point: { x: nextPoint.x, y: nextPoint.y }
    });
  }

  const tmpVector3 = new THREE.Vector3();

  function performAction(action, dataPlayer, player) {
    player.setState(dataPlayer.state);
    switch(action.type) {
    case 'player_started_moving':
      player.moveTo(action.point, getTimePassed(dataPlayer.time));
      break;
    case 'player_finished_moving':
      player.moving = false;
      break;
    case 'target_player':
      {
        player.moving = false;
        const targetPlayer = players[action.target_id];
        const ability = player.abilities[action.ability_index];
        tmpVector3.set(0, 0, 0.5).add(player.position);
        const projectile = new HomingMissile(action.hit_id, ability, tmpVector3, targetPlayer);
        projectile.targetObject(targetPlayer, getTimePassed(dataPlayer.time));
        gameEngine.addProjectile(projectile);
        projectile.onFinishedMoving(() => {
          possibleHits[action.hit_id] = true;
          App.game.sendAction({
            type: 'player_hit',
            damage: ability.damage,
            hit_id: action.hit_id,
            player_id: action.target_id
          });
        });
      }
      break;
    case 'player_hit':
      {
        if (!possibleHits[action.hit_id]) return;
        const targetPlayer = players[action.player_id];
        console.log('HP: ', player.hp);
        delete possibleHits[action.hit_id];
      }
      break;
    case 'player_died':
      {
        const killer = players[action.killer_id];
        killer.setState(action.killer_state);
        player.die();
        if (player === thisPlayer) {
          respawnLater(player);
          deathText.text(`${killer.name} killed you!`);
          deathOverlay.show();
          spawnTime = parseFloat(action.spawn_time, 10) * 1000;
          deathCounter.text(Math.floor(spawnTime / 1000));
          gameEngine.followPlayer(killer);
        }
        updateScoreCard();
      }
      break;
    case 'player_respawn':
      player.respawn(dataPlayer.state);
      if (player === thisPlayer) {
        deathOverlay.hide();
        gameEngine.followPlayer(thisPlayer);
      }
      break;
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
          players[data.player.id] = new Player(data.player.id, data.player.name, data.player.state);
          gameEngine.addPlayer(players[data.player.id]);
        }
        updateScoreCard();
        break;
      case 'player_setup':
        thisPlayer = players[playerId] = new Player(playerId, data.player.name, data.player.state);
        const thisTime = +(new Date());
        timeOffset = (data.player.time * 1000.0) - thisTime;
        thisPlayer.onFinishedMoving(() => {
          navigateToNextPoint();
        })
        if (thisPlayer.state.dead) {
          thisPlayer.die();
          respawnLater(thisPlayer);
          deathText.text('You are dead!');
          deathOverlay.show();
          spawnTime = 5000;
          deathCounter.text('');
        }
        updateScoreCard();
        gameEngine.addPlayer(thisPlayer);
        gameEngine.setThisPlayer(thisPlayer);
        gameEngine.followPlayer(thisPlayer);
        updateScoreCard();
        isSetUp = true;
        break;
      case 'other_players':
        data.players.forEach(p => {
          players[p.id] = new Player(p.id, p.name, p.state);
          gameEngine.addPlayer(players[p.id]);

          if (p.action) {
            performAction(p.action, p, players[p.id]);
          }
        });
        updateScoreCard();
        otherPlayersSetUp = true;
        break;
      case 'player_left':
        const player = players[data.player.id];
        if (player === thisPlayer) {
          Turbolinks.visit('..');
        } else {
          gameEngine.removePlayer(player);
          delete players[data.player.id];
          updateScoreCard();
        }
        break;
      case 'player_action':
        if (!isSetUp || !otherPlayersSetUp) break;
        performAction(data.action, data.player, players[data.player.id]);
        break;
      default:
        break;
      }
    },

    sendAction(action) {
      this.perform('send_action', action);
    } ,

    leaveGame() {
      this.perform('leave_game', {});
    }
  });

  function createVisualPath(vertices) {
  	let lineGeometry = new THREE.Geometry();
  	let vertArray = lineGeometry.vertices;
    vertices.forEach(v => vertArray.push(v));
  	lineGeometry.computeLineDistances();
  	let lineMaterial = new THREE.LineDashedMaterial({
    	color: 0xff0000,
    	linewidth: 10,
    	scale: 1,
    	dashSize: 0.2,
    	gapSize: 0.1
    });
  	let line = new THREE.Line( lineGeometry, lineMaterial );
    return line;
  }

  gameEngine.onMouseClicked(point => {
    navPath = gameEngine.map.getPath(thisPlayer.position, point);
    if (!navPath) return;

    // if (visualNavPath) gameEngine.scene.remove(visualNavPath);
  	// let lineGeometry = new THREE.Geometry();
  	// let vertArray = lineGeometry.vertices;
    // navPath.forEach(p => vertArray.push(new THREE.Vector3(p.x, p.y, 0.5)));
  	// lineGeometry.computeLineDistances();
  	// let lineMaterial = new THREE.LineBasicMaterial( { color: 0xff0000 } );
  	// visualNavPath = new THREE.Line( lineGeometry, lineMaterial );
    // visualNavPath.add(gameEngine.map.getDebugBlocks(navPath));
  	// gameEngine.scene.add(visualNavPath);

    navigateToNextPoint();
  });

  gameEngine.onPlayerClicked(player => {
    if (player === thisPlayer || player.team === thisPlayer.team) return false;
    const time = +(new Date());
    const abilityIndex = 0;
    const ability = thisPlayer.abilities[abilityIndex];
    if (time - ability.last_hit < ability.cooldown) return false;
    tmpVector3.copy(thisPlayer.position).sub(player.position);
    if (tmpVector3.lengthSq() > ability.range * ability.range) return false;
    thisPlayer.moving = false;
    // gameEngine.scene.remove(visualNavPath);
    App.game.sendAction({
      type: 'target_player',
      point: { x: thisPlayer.position.x, y: thisPlayer.position.y },
      target_id: player.playerId,
      ability_index: abilityIndex
    });
    return true;
  });

  gameEngine.onMonumentClicked(monument => {
    if (monument.team === thisPlayer.team) return false;
    return true;
  });

  $(document).keyup(function(e) {
    if (e.keyCode == 27) { // escape key maps to keycode `27`
      gameMenu.toggle();
    }
  });

  leaveButton.on('click', () => {
    App.game.leaveGame();
  });

  resumeButton.on('click', () => {
    gameMenu.toggle();
  });

  menuButton.on('click', () => {
    gameMenu.toggle();
  })
});
