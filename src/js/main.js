/*
Reference:
https://threejsfundamentals.org/
 */

//import * as THREE from 'https://threejsfundamentals.org/threejs/resources/threejs/r119/build/three.module.js';
//import * as THREE from './threejs/r119/build/three.module.js';
//import * as BREP from './brep.js';
// let e = new BREP.Edge();


const brepTreeViewSelector = $('#brepTreeView');
const event_brepTreeViewInitReady = 'brepTreeViewInitReady';

const Main = function() {

    function initButtons() {
        const btnMev = document.querySelector('#btnMev');
        const btnMef = document.querySelector('#btnMef');
        const btnMvfs = document.querySelector('#btnMvfs');
        const btnKemr = document.querySelector('#btnKemr');
        const btnKfmrh = document.querySelector('#btnKfmrh');
        const btnSemv = document.querySelector('#btnSemv');

        btnMev.setAttribute("disabled","disabled");
        btnMef.setAttribute("disabled","disabled");
        btnMvfs.removeAttribute("disabled");
        btnKemr.setAttribute("disabled","disabled");
        btnKfmrh.setAttribute("disabled","disabled");
        btnSemv.setAttribute("disabled","disabled");
    }

    function setupTreeView() {
        brepTreeViewSelector.jstree({ // create an instance
            'core': {
                'data': [],
                "check_callback": true, // so that create_node works
            },
            "plugins": [ "changed" ]
        });
        brepTreeViewSelector.bind('ready.jstree', function () {
            const treeView = brepTreeViewSelector.jstree(true); // get the existing instance
            treeView.create_node(
                "#",
                { id: "globalSolids", text: "Solids"},
                'last');
            treeView.create_node(
                "#",
                { id: "globalEdges", text: "Edges"},
                'last');
            treeView.create_node(
                "#",
                { id: "globalVertices", text: "Vertices"},
                'last');
            //$(initButtons);
            brepTreeViewSelector.trigger(event_brepTreeViewInitReady);
        });
    }

    function getRenderManager(renderer, scene, camera) {
        return {
            resizeRendererToDisplaySize: function (renderer) {
                const canvas = renderer.domElement;

                // for HD-DPI display
                const pixelRatio = window.devicePixelRatio;
                const width  = canvas.clientWidth  * pixelRatio | 0;
                const height = canvas.clientHeight * pixelRatio | 0;

                // for low resolution display
                //const width = canvas.clientWidth;
                //const height = canvas.clientHeight;

                const needResize = canvas.width !== width || canvas.height !== height;
                if (needResize) {
                    renderer.setSize(width, height, false);
                }
                return needResize;
            },

            render: function () {
                if (this.resizeRendererToDisplaySize(renderer)) {
                    const canvas = renderer.domElement;
                    camera.aspect = canvas.clientWidth / canvas.clientHeight;
                    camera.updateProjectionMatrix();
                }

                renderer.render(scene, camera);
            }
        };
    }

    function setupThreejsScene() {
        const canvas = document.querySelector('#c');
        const renderer = new THREE.WebGLRenderer({canvas});

        const fov = 75;
        const aspect = 2;  // the canvas default
        const near = 0.1;
        const far = 100;
        const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
        camera.position.set(3, 3.5, 4);
        camera.up.set(0, 0, 1);
        camera.lookAt(new THREE.Vector3(0, 0, 0));

        const controls = new THREE.OrbitControls(camera, canvas);
        controls.target.set(0, 0, 0);
        controls.update();

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x666666); // gray

        // {
        //     const color = 0xFFFFFF;
        //     const intensity = 0.2;
        //     const light = new THREE.AmbientLight(color, intensity);
        //     scene.add(light);
        // }
        {
            const skyColor = 0xB1E1FF;  // light blue
            const groundColor = 0xFFFFFF;  // white
            const intensity = 0.4;
            const light = new THREE.HemisphereLight(skyColor, groundColor, intensity);
            scene.add(light);
        }
        {
            const color = 0xFFFFFF;
            const intensity = 1;
            const light = new THREE.DirectionalLight(color, intensity);
            light.position.set(-1, -2, -4);
            scene.add(light);
        }

        const axesHelper = new THREE.AxesHelper( 50 );
        scene.add( axesHelper );

        /*
        const boxWidth = 1;
        const boxHeight = 1;
        const boxDepth = 1;
        const geometry = new THREE.BoxGeometry(boxWidth, boxHeight, boxDepth);

        function makeInstance(geometry, color, x) {
            const material = new THREE.MeshPhongMaterial({color});

            const cube = new THREE.Mesh(geometry, material);
            scene.add(cube);

            cube.position.x = x;

            return cube;
        }

        const cubes = [
            makeInstance(geometry, 0x44aa88,  0),
            makeInstance(geometry, 0x8844aa, -2),
            makeInstance(geometry, 0xaa8844,  2),
        ];
         */

        const renderManager = getRenderManager(renderer, scene, camera);
        renderManager.render();
        controls.addEventListener('change', () => renderManager.render());
        window.addEventListener('resize', () => renderManager.render());

        return [scene, renderManager];
    }

    return {
        main: function() {
            setupTreeView();
            const [scene, renderManager] = setupThreejsScene();
            const buttonManager = new ButtonManager();
            const brep = new Brep(scene, renderManager, buttonManager);
            const dialogManager = new DialogManager(scene, brep);

            brepTreeViewSelector.bind(event_brepTreeViewInitReady,
                function() {
                    //initButtons();
                    buttonManager.initButtons();
                    dialogManager.initDialogs();
                });

            // const btnTest = document.querySelector('#btnTest');
            // btnTest.addEventListener("click", brep.test);
        }
    }
};

(new Main()).main();
