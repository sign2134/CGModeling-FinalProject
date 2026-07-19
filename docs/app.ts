
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import * as CANNON from 'cannon-es';

class ThreeJSContainer {
    private scene!: THREE.Scene;
    private light!: THREE.Light;
    private camera!: THREE.PerspectiveCamera;
    private timer = 0;
    private isRunning = false;
    private gameOver = false;
    private redCells: THREE.Mesh[] = [];
    private scoreElement!: HTMLDivElement;
    private targetIndex = 0;
    private gameStarted = false;
    constructor() {

    }

    // 画面部分の作成(表示する枠ごとに)*
    public createRendererDOM = (width: number, height: number,) => {
        const renderer = new THREE.WebGLRenderer();
        renderer.setSize(width, height);
        renderer.setClearColor(new THREE.Color(0x495ed));
        renderer.shadowMap.enabled = true;
       // -------------------タイム表示に生成AIを使用---------------------
        this.scoreElement = document.createElement("div");
        this.scoreElement.style.position = "absolute";
        this.scoreElement.style.top = "20px";
        this.scoreElement.style.left = "20px";
        this.scoreElement.style.fontSize = "32px";
        this.scoreElement.style.color = "white";
        this.scoreElement.style.fontWeight = "bold";
        this.scoreElement.style.zIndex = "100";
        this.scoreElement.textContent = "Enterを押してスタート!";  
        document.body.appendChild(this.scoreElement);
        //-----------------------------------------------------------------
        //カメラの設定
        this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
        this.camera.position.set(0, 10, 0);
        this.camera.up.set(0, 0, -1);
        this.camera.lookAt(new THREE.Vector3(0, 0, 0));


        const orbitControls = new OrbitControls(this.camera, renderer.domElement);
        orbitControls.enabled = false;
        this.createScene();
        // 毎フレームのupdateを呼んで，render
        // reqestAnimationFrame により次フレームを呼ぶ
        const render: FrameRequestCallback = (_time) => {
            //orbitControls.update();

            renderer.render(this.scene, this.camera);
            requestAnimationFrame(render);
        }
        requestAnimationFrame(render);

        renderer.domElement.style.cssFloat = "left";
        renderer.domElement.style.margin = "10px";
        return renderer.domElement;
    }

    // シーンの作成(全体で1回)
    private createScene = () => {
        this.scene = new THREE.Scene();
        const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) });
        world.defaultContactMaterial.friction = 0.3;
        world.defaultContactMaterial.restitution = 0.0;
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshLambertMaterial({ color: 0x00ff00 });
        const cube = new THREE.Mesh(geometry, material);
        cube.position.set(0.5, 3, 0.5);
        this.scene.add(cube);

        const cubeShape = new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5));
        const cubeBody = new CANNON.Body({ mass: 1 });
        cubeBody.linearDamping = 0.6;
        cubeBody.addShape(cubeShape);
        cubeBody.position.set(cube.position.x, cube.position.y, cube.position.z);
        cubeBody.quaternion.set(cube.quaternion.x, cube.quaternion.y, cube.quaternion.z, cube.quaternion.w);
        world.addBody(cubeBody);
        document.addEventListener('keyup', (event) => {
            if (event.key === 'Enter' && !this.gameStarted) {
                this.gameStarted = true;
                this.isRunning = true;
                return;
            }
            if (!this.gameStarted || this.gameOver) 
                return;
            switch (event.key) {
                case 'ArrowUp':
                    cubeBody.position.z = Math.max(-4.5, cubeBody.position.z - 1.0);
                    break;
                case 'ArrowDown':
                    cubeBody.position.z = Math.min(4.5, cubeBody.position.z + 1.0);
                    break;
                case 'ArrowLeft':
                    cubeBody.position.x = Math.max(-4.5, cubeBody.position.x - 1.0);
                    break;
                case 'ArrowRight':
                    cubeBody.position.x = Math.min(4.5, cubeBody.position.x + 1.0);
                    break;
            }
        });
        // グリッド表示 
        const gridHelper = new THREE.GridHelper(10, 10);
        this.scene.add(gridHelper);
        let nextGridY = -100;

        //ライトの設定
        this.light = new THREE.DirectionalLight(0xffffff);
        const lvec = new THREE.Vector3(1, 1, 1).normalize();
        this.light.position.set(lvec.x, lvec.y, lvec.z);
        this.scene.add(this.light);
        const morningColor = new THREE.Color(0xffb77a); 
        const aftnoonColor = new THREE.Color(0x87ceeb);     
        const nightColor = new THREE.Color(0x050520);   
        const baggroundColor = new THREE.Color();
        const cycleDistance = 2000;
        // 毎フレームのupdateを呼んで，更新
        // reqestAnimationFrame により次フレームを呼ぶ
        const update: FrameRequestCallback = (_time) => {

            if (this.gameStarted && !this.gameOver) {
                world.gravity.set(0, -9.82 - (this.timer * 0.05), 0);
                world.fixedStep();
            }
            cube.position.set(cubeBody.position.x, cubeBody.position.y, cubeBody.position.z);
            cube.quaternion.set(cubeBody.quaternion.x, cubeBody.quaternion.y, cubeBody.quaternion.z, cubeBody.quaternion.w);
            const distance = Math.max(0, 3 - cubeBody.position.y);
            const cycle = (distance % cycleDistance) / cycleDistance;

            if (cycle < 0.33) {
                const border = cycle / 0.33;
                baggroundColor.lerpColors(morningColor, aftnoonColor, border);
            } else if (cycle < 0.66) {
                const border = (cycle - 0.33) / 0.33;
                baggroundColor.lerpColors(aftnoonColor, nightColor, border);
            } else {
                const border = (cycle - 0.66) / 0.34;
                baggroundColor.lerpColors(nightColor, morningColor, border);
            }
            this.scene.background = baggroundColor;
            if (this.gameStarted) {
                if (cubeBody.position.y < nextGridY + 50) {
                    const newGrid = new THREE.GridHelper(10);
                    newGrid.position.y = nextGridY;
                    this.scene.add(newGrid);
                    const cellGeometry = new THREE.PlaneGeometry(1, 1);
                    const cellMaterial = new THREE.MeshBasicMaterial({
                        color: 0xff0000,
                        side: THREE.DoubleSide,
                        transparent: true,
                        opacity: 0.6
                    });
                    const redaim = new THREE.Mesh(cellGeometry, cellMaterial);
                    redaim.rotation.x = Math.PI / 2;
                    const randomX = Math.floor(Math.random() * 10) - 4.5;
                    const randomZ = Math.floor(Math.random() * 10) - 4.5;
                    redaim.position.set(randomX, nextGridY + 0.01, randomZ);
                    this.scene.add(redaim);
                    this.redCells.push(redaim);

                    nextGridY -= 100;
                }
                if (!this.gameOver) {
                    const targetCell = this.redCells[this.targetIndex];
                    if (targetCell && cubeBody.position.y <= targetCell.position.y) {
                        const dx = Math.abs(cubeBody.position.x - targetCell.position.x);
                        const dz = Math.abs(cubeBody.position.z - targetCell.position.z);
                        if (dx < 0.6 && dz < 0.6) {
                            if (!this.isRunning) {
                                this.isRunning = true;
                            }
                            this.targetIndex++;
                        } else {
                            this.gameOver = true;
                            this.isRunning = false;
                            this.scoreElement.textContent = `ゲームオーバー! タイム: ${this.timer.toFixed(2)}`;
                            world.gravity.set(0, 0, 0);
                            cubeBody.velocity.set(0, 0, 0);
                        }
                    }
                    if (this.isRunning) {
                        this.timer += 0.016; 
                        this.scoreElement.textContent = `タイム: ${this.timer.toFixed(2)}`;
                    }
                }
            }


            const target = new THREE.Vector3(
                cubeBody.position.x,
                cubeBody.position.y + 10,
                cubeBody.position.z
            );


            this.camera.position.copy(target);


            this.camera.lookAt(new THREE.Vector3(
                cubeBody.position.x,
                cubeBody.position.y,
                cubeBody.position.z
            ));
            requestAnimationFrame(update);
        }
        requestAnimationFrame(update);
    }
}

window.addEventListener("DOMContentLoaded", init);

function init() {
    const container = new ThreeJSContainer();

    const viewport = container.createRendererDOM(640, 480);
    document.body.appendChild(viewport);
}
