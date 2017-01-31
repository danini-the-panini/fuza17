const App = require('../cable');

const THREE = require('three');
const GameEngine = require('./game_engine');
const Player = require('./player');
const HomingMissile = require('./homingMissile');
const Grenade = require('./grenade');

$(document).on('turbolinks:load', () => {
  if (App.game) {
    App.game.unsubscribe();
  }

  const canvas = $('#game-canvas');

  if (canvas.length === 0) {
    $('html').css('overflow', 'auto');
    return;
  }
  $('html').css('overflow', 'hidden');

  const deathOverlay = $('#death-overlay');
  const deathCounter = $('#death-counter');
  const deathText = $('#death-text');
  const scoreCardBody = $('#score-card tbody');
  const playerHudOverlay = $('#hud-overlay');
  const thisPlayerHealthBar = $('#player-health-bar');

  const gameMenu = $('#menu');
  const leaveButton = $('#leave-button');
  const resumeButton = $('#resume-button');

  const menuButton = $('#menu-button');

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

  function getClientTime(serverTime) {
    return serverTime * 1000.0 - timeOffset;
  }

  function getTimePassed(startTime) {
    const thisTime = +(new Date());
    const thisStartTime = getClientTime(startTime);
    return thisTime - thisStartTime;
  }

  let isSetUp = false;
  let otherPlayersSetUp = false;

  let gameState;
  let gameIsOver = false;

  const tmpVector3 = new THREE.Vector3();

  function updateScoreCard() {
    let html = '';
    for (let id in players) {
      if (!players.hasOwnProperty(id)) return;
      const player = players[id];
      html += `<tr><td>${player.name}</td><td>${player.state.kills}</td><td>${player.state.deaths}</td></tr>`;
    }
    scoreCardBody.html(html);
  }

  function findOrCreateHudForPlayer(player) {
    const hudId = `player-hud-${player.playerId}`;
    let hudForPlayer = document.getElementById(hudId);
    if (hudForPlayer) return hudForPlayer;
    hudForPlayer = document.createElement('div');
    hudForPlayer.id = hudId;
    hudForPlayer.classList += 'player-hud';
    playerHudOverlay.append(hudForPlayer);
    return hudForPlayer;
  }

  function deleteHudForPlayer(player) {
    const hudForPlayer = findOrCreateHudForPlayer(player);
    hudForPlayer.remove();
  }

  const MAX_HP = 100.0; // TODO: make this variable
  function updateHudForPlayer(player) {
    const hudForPlayer = findOrCreateHudForPlayer(player);
    const healthPercent = (player.state.hp / MAX_HP) * 100.0;
    hudForPlayer.innerHTML = `
      <div class="player-hud__nametag">${player.name}</div>
      <div class="player-hud__health-bar">
        <div class="player-hud__health-bar-full" style="width:${healthPercent}%">
      </div>
    `;
  }

  function updateThisPlayerHud() {
    const healthPercent = (thisPlayer.state.hp / MAX_HP) * 100.0;
    thisPlayerHealthBar.text(`${Math.round(thisPlayer.state.hp)} / ${MAX_HP}`);
    thisPlayerHealthBar.css('width', `${healthPercent}%`);
  }

  function updatePlayerHudPosition(player) {
    const hudForPlayer = findOrCreateHudForPlayer(player);

    gameEngine.getPlayerScreenCoords(player, tmpVector3);

    hudForPlayer.style.left = `${tmpVector3.x}px`;
    hudForPlayer.style.top = `${tmpVector3.y}px`;
  }

  const MAX_MONUMENT_HP = 1000.0; // TODO: get this from the server
  function updateMonumentHP(team) {
    const monumentHp = gameState.monument_hps[team];
    const hpPercent = (monumentHp / MAX_MONUMENT_HP) * 100.0;
    const monumentHpEl = $(`#monument-health-bar-${team}`);
    monumentHpEl.width(`${hpPercent}%`);
    monumentHpEl.text(`${Math.round(monumentHp)} / ${MAX_MONUMENT_HP}`);
  }

  function updateAllMonumentHPs() {
    updateMonumentHP(0);
    updateMonumentHP(1);
  }

  let spawnTime;

  function respawnLater(player) {
    setTimeout(() => {
      if (!player.dead) return;
      const timePassed = getTimePassed(player.state.death_time);
      console.log(spawnTime, player.state.death_time, timePassed);
      deathCounter.text(Math.round((spawnTime - timePassed) / 1000));
      App.game.player_respawn(player);
      respawnLater(player);
    }, 1000);
  }

  function navigateToNextPoint() {
    const nextPoint = navPath.shift();
    if (!nextPoint) {
      // gameEngine.scene.remove(visualNavPath);
      App.game.player_finished_moving();
      return;
    }
    App.game.player_started_moving(nextPoint);
  }

  function fireHomingMissile(action, dataPlayer, player, target, onHitCallback) {
    const ability = player.abilities[action.ability_index];
    tmpVector3.set(0, 0, 0.5).add(player.position);
    const projectile = new HomingMissile(action.hit_id, ability, tmpVector3, target, player.team);
    projectile.targetObject(target, getTimePassed(dataPlayer.time));
    gameEngine.addProjectile(projectile);
    projectile.onFinishedMoving(() => onHitCallback(projectile));
  }

  function fireGrenade(action, dataPlayer, player, target, onHitCallback) {
    const ability = player.abilities[action.ability_index];
    const projectile = new Grenade(action.hit_id, ability, player.position, target, player.team);
    projectile.targetPoint(target, getTimePassed(dataPlayer.time));
    gameEngine.addProjectile(projectile);
    projectile.onFinishedMoving(() => onHitCallback(projectile));
  }

  function gameOver(winner) {
    gameIsOver = true;

    const loser = 1 - winner;
    const loserMonument = gameEngine.map.monuments[loser];
    gameEngine.map.remove(loserMonument);
    gameEngine.particleSystem.createExplosion(
      new THREE.MeshLambertMaterial({ color: Player.TEAM_COLORS[loser]}),
      loserMonument.position,
      0.006, 0.010, 1000
    );

    const victory = winner === thisPlayer.team;
    const resultText =
    $('#game-over-overlay').show().addClass(victory ? 'is-victorious' : 'is-defeated');
    $('#game-over-text').text(victory ? 'Victory!' : 'Defeat!');
  }

  function getDamageDone(player, ability, position) {
    const dist = tmpVector3.copy(position).sub(player.position).length();
    if (dist > ability.radius) return 0;
    return (1.0 - dist / ability.radius) * ability.damage;
  }

  const actionHandlers = {
    player_joined(data) {
      if (data.player.id !== playerId) {
        players[data.player.id] = new Player(data.player.id, data.player.name, data.player.state);
        updateHudForPlayer(players[data.player.id]);
        gameEngine.addPlayer(players[data.player.id]);
      }
      updateScoreCard();
    },

    player_setup(data) {
      thisPlayer = players[playerId] = new Player(playerId, data.player.name, data.player.state);
      const thisTime = +(new Date());
      timeOffset = (data.player.time * 1000.0) - thisTime;
      thisPlayer.onFinishedMoving(() => {
        navigateToNextPoint();
      });
      if (thisPlayer.state.dead) {
        thisPlayer.die();
        respawnLater(thisPlayer);
        deathText.text('You are dead!');
        deathOverlay.show();
        spawnTime = 5000;
        deathCounter.text('');
      }
      updateScoreCard();
      updateThisPlayerHud();
      gameEngine.addPlayer(thisPlayer);
      gameEngine.setThisPlayer(thisPlayer);
      gameEngine.followPlayer(thisPlayer);

      if (data.game_over) {
        gameOver(data.winner);
      }

      isSetUp = true;
    },

    other_players(data) {
      data.players.forEach(p => {
        players[p.id] = new Player(p.id, p.name, p.state);
        gameEngine.addPlayer(players[p.id]);

        if (p.action) {
          this[p.action.action]({ player: p, ...p.action })
        }
        if (players[p.id].state.dead) {
          players[p.id].die();
        } else {
          updateHudForPlayer(players[p.id]);
        }
      });
      updateScoreCard();
      otherPlayersSetUp = true;
    },

    player_left(data) {
      const player = players[data.player.id];
      if (player === thisPlayer) {
        Turbolinks.visit('..');
      } else {
        gameEngine.removePlayer(player);
        delete players[data.player.id];
        updateScoreCard();
        deleteHudForPlayer(players[data.player.id]);
      }
    },

    player_started_moving(data) {
      const player = players[data.player.id];
      player.setState(data.player.state);
      player.moveTo(data.point, getTimePassed(data.player.time));
    },

    player_finished_moving(data) {
      const player = players[data.player.id];
      player.setState(data.player.state);
      player.moving = false;
    },

    target_player(data) {
      const player = players[data.player.id];
      player.setState(data.player.state);
      player.moving = false;
      const targetPlayer = players[data.target_id];
      const ability = player.abilities[data.ability_index];
      fireHomingMissile(data, data.player, player, targetPlayer, projectile => {
        gameEngine.particleSystem.createExplosion(
          new THREE.MeshLambertMaterial({ color: Player.TEAM_COLORS[player.team]}),
          projectile.position,
          0.001, 0.004, 100
        );
        possibleHits[data.hit_id] = true;
        App.game.player_hit(targetPlayer, data.hit_id, ability.damage);
      });
    },

    fire_grenade(data) {
      const player = players[data.player.id];
      player.setState(data.player.state);
      player.moving = false;
      const target = tmpVector3.set(data.target_point.x, data.target_point.y, 0);
      const ability = player.abilities[data.ability_index];
      fireGrenade(data, data.player, player, target, projectile => {
        gameEngine.particleSystem.createExplosion(
          new THREE.MeshLambertMaterial({ color: Player.TEAM_COLORS[player.team]}),
          projectile.position,
          0.001, 0.004, 100
        );
        possibleHits[data.hit_id] = true;
        const affectedPlayers = {};
        let numAffectedPlayers = 0;
        for (let id in players) {
          if (!players.hasOwnProperty(id)) continue;
          const p = players[id];
          if (p.team === player.team) continue;
          const damage = getDamageDone(p, ability, projectile.position);
          if (damage <= 0) continue;
          affectedPlayers[id] = damage;
          numAffectedPlayers++;
        }
        const monument = gameEngine.map.monuments[1 - player.team];
        const monumentDamage = getDamageDone(monument, ability, projectile.position);
        if (numAffectedPlayers > 0 || monumentDamage > 0) {
          App.game.splash_damage(affectedPlayers, monumentDamage, data.hit_id);
        }
      });
    },

    target_monument(data) {
      const player = players[data.player.id];
      player.setState(data.player.state);
      player.moving = false;
      const targetTeam = 1 - player.team;
      const targetMonument = gameEngine.map.monuments[targetTeam];
      const ability = player.abilities[data.ability_index];
      fireHomingMissile(data, data.player, player, targetMonument, projectile => {
        gameEngine.particleSystem.createExplosion(
          new THREE.MeshLambertMaterial({ color: Player.TEAM_COLORS[player.team]}),
          projectile.position,
          0.002, 0.006
        );
        possibleHits[data.hit_id] = true;
        App.game.monument_hit(targetTeam, data.hit_id, ability.damage);
      });
    },

    player_hit(data) {
      const player = players[data.player.id];
      player.setState(data.player.state);
      if (!possibleHits[data.hit_id]) return;
      const targetPlayer = players[data.player_id];
      delete possibleHits[data.hit_id];
      if (player === thisPlayer) {
        updateThisPlayerHud();
      } else {
        updateHudForPlayer(player);
      }
    },

    splash_damage(data) {
      const player = players[data.player.id];
      player.setState(data.player.state);
      if (!possibleHits[data.hit_id]) return;
      delete possibleHits[data.hit_id];
      for (let id in data.players_affected) {
        if (!data.players_affected.hasOwnProperty(id)) continue;
        if (!players.hasOwnProperty(id)) continue;
        const p = players[id];
        p.state.hp = data.players_affected[id];
        if (p === thisPlayer) {
          updateThisPlayerHud();
        } else {
          updateHudForPlayer(p);
        }
      }
    },

    monument_hit(data) {
      const player = players[data.player.id];
      player.setState(data.player.state);
      if (!possibleHits[data.hit_id]) return;
      const targetMonument = gameEngine.map.monuments[data.monument_id];
      delete possibleHits[data.hit_id];
    },

    player_died(data) {
      const player = players[data.player.id];
      player.setState(data.player.state);
      const killer = players[data.killer_id];
      killer.state.kills = data.killer_kills;
      player.die();
      if (player === thisPlayer) {
        respawnLater(player);
        deathText.text(`${killer.name} killed you!`);
        deathOverlay.show();
        spawnTime = parseFloat(data.spawn_time) * 1000;
        deathCounter.text(Math.floor(spawnTime / 1000));
        gameEngine.followPlayer(killer);
      } else {
        deleteHudForPlayer(player);
        gameEngine.particleSystem.createExplosion(
          new THREE.MeshLambertMaterial({ color: Player.TEAM_COLORS[player.team]}),
          player.position,
          0.004, 0.008
        );
      }
      updateScoreCard();
    },

    player_respawn(data) {
      const player = players[data.player.id];
      player.setState(data.player.state);
      player.respawn(data.player.state);
      if (player === thisPlayer) {
        deathOverlay.hide();
        gameEngine.followPlayer(thisPlayer);
        updateThisPlayerHud();
      } else {
        updateHudForPlayer(player);
      }
    },

    game_over(data) {
      gameOver(data.winner);
    }
  };

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
      if (data.game_state) {
        gameState = data.game_state;
        updateAllMonumentHPs();
      }
      actionHandlers[data.type](data);
    },

    player_started_moving(point) {
      if (gameIsOver) return;
      this.perform('player_started_moving', {
        position: { x: thisPlayer.position.x, y: thisPlayer.position.y },
        point: { x: point.x, y: point.y }
      });
    },

    player_finished_moving() {
      if (gameIsOver) return;
      this.perform('player_finished_moving', {
        position: { x: thisPlayer.position.x, y: thisPlayer.position.y },
      });
    },

    target_player(player, abilityIndex) {
      if (gameIsOver) return;
      this.perform('target_player', {
        point: { x: thisPlayer.position.x, y: thisPlayer.position.y },
        target_id: player.playerId,
        ability_index: abilityIndex
      });
    },

    fire_grenade(target, abilityIndex) {
      if (gameIsOver) return;
      this.perform('fire_grenade', {
        point: { x: thisPlayer.position.x, y: thisPlayer.position.y },
        target_point: { x: target.x, y: target.y },
        ability_index: abilityIndex
      });
    },

    target_monument(abilityIndex) {
      if (gameIsOver) return;
      this.perform('target_monument', {
        point: { x: thisPlayer.position.x, y: thisPlayer.position.y },
        ability_index: abilityIndex
      });
    },

    player_hit(player, hitId, damage) {
      if (gameIsOver) return;
      this.perform('player_hit', {
        damage,
        hit_id: hitId,
        player_id: player.playerId
      });
    },

    splash_damage(affectedPlayers, monumentDamage, hitId) {
      if (gameIsOver) return;
      this.perform('splash_damage', {
        hit_id: hitId,
        players_affected: affectedPlayers,
        monument_damage: monumentDamage
      });
    },

    monument_hit(monumentId, hitId, damage) {
      if (gameIsOver) return;
      this.perform('monument_hit', {
        damage,
        hit_id: hitId,
        monument_id: monumentId
      });
    },

    player_respawn(player) {
      if (gameIsOver) return;
      this.perform('player_respawn', {
        player_id: player.playerId
      });
    },

    leave_game() {
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

  function inRange(a, b, range) {
    tmpVector3.copy(a).sub(b);
    if (tmpVector3.lengthSq() > range * range) return false;
    return true;
  }

  function canUseAbility(ability, target = null) {
    const time = +(new Date());
    if (time - ability.last_hit < ability.cooldown) return false;
    if (target && ability.type !== 'direction') {
      if (!inRange(thisPlayer.position, target, ability.range)) return false;
    }
    return true;
  }

  function triggerGrenadeLaunch() {
    const abilityIndex = 1;
    const ability = thisPlayer.abilities[abilityIndex];
    const target = gameEngine.getMouseFloorIntersection();
    if (!canUseAbility(ability, target)) return;
    thisPlayer.moving = false;
    // gameEngine.scene.remove(visualNavPath);
    App.game.fire_grenade(target, abilityIndex);
    return true;
  }

  gameEngine.onPlayerClicked(player => {
    if (player === thisPlayer || player.team === thisPlayer.team) return false;
    const abilityIndex = 0;
    const ability = thisPlayer.abilities[abilityIndex];
    if (!canUseAbility(ability, player.position)) return;
    thisPlayer.moving = false;
    // gameEngine.scene.remove(visualNavPath);
    App.game.target_player(player, abilityIndex);
    return true;
  });

  gameEngine.onMonumentClicked(monument => {
    if (monument.team === thisPlayer.team) return false;
    const time = +(new Date());
    const abilityIndex = 0;
    const ability = thisPlayer.abilities[abilityIndex];
    if (!canUseAbility(ability, monument)) return;
    thisPlayer.moving = false;
    // gameEngine.scene.remove(visualNavPath);
    App.game.target_monument(abilityIndex);
    return true;
  });

  gameEngine.onUpdate(() => {
    for (let id in players) {
      if (!players.hasOwnProperty(id)) return;
      const player = players[id];
      if (player === thisPlayer) continue;
      updatePlayerHudPosition(player);
    }
  });

  $(document).keyup(function(e) {
    const c = String.fromCharCode(e.keyCode).toUpperCase();
    if (e.keyCode == 27) { // escape key maps to keycode `27`
      gameMenu.toggle();
    } else if (c === 'Q') {
      triggerGrenadeLaunch();
    }
  });

  leaveButton.on('click', evt => {
    if (gameIsOver) {
      Turbolinks.visit('/games');
    } else {
      App.game.leave_game();
    }
    evt.preventDefault();
    evt.stopPropagation();
  });

  $('#game-over-button').on('click', evt => {
    evt.preventDefault();
    evt.stopPropagation();
  });

  resumeButton.on('click', evt => {
    gameMenu.toggle();
    evt.preventDefault();
    evt.stopPropagation();
  });

  menuButton.on('click', evt => {
    gameMenu.toggle();
    evt.preventDefault();
    evt.stopPropagation();
  })
});
