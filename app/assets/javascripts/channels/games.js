const App = require('../cable');
const THREE = require('three');

$(document).on('turbolinks:load', () => {
  if (App.game) {
    App.game.unsubscribe();
  }

  const canvas = $('#game-canvas');

  if (canvas.length === 0) return;

  const gameId = canvas.data('game-id');

  App.game = App.cable.subscriptions.create({
    channel: 'GamesChannel',
    game_id: gameId
  }, {
    connected() {},

    disconnected() {},

    received(data) {
      // things.append(`<li>${data.message}</li>`)
    },

    doAThing() {
      return this.perform('do_a_thing', { gameId });
    }
  });

	const scene = new THREE.Scene();
	const camera = new THREE.PerspectiveCamera( 75, window.innerWidth/window.innerHeight, 0.1, 1000 );

	const renderer = new THREE.WebGLRenderer({
    canvas: canvas.get(0)
  });
	renderer.setSize( window.innerWidth, window.innerHeight );

	const geometry = new THREE.BoxGeometry( 1, 1, 1 );
	const material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
	const cube = new THREE.Mesh( geometry, material );
	scene.add( cube );

	camera.position.z = 5;

  $(window).on('resize', () => {
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
  	renderer.setSize( window.innerWidth, window.innerHeight );
  });

	function render() {
		requestAnimationFrame( render );

		cube.rotation.x += 0.1;
		cube.rotation.y += 0.1;

		renderer.render(scene, camera);
	};

	render();
});
