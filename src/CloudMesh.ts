import * as THREE from "three";
import { getRandomArbitrary } from "./three-utils";

interface CloudMeshOptions {
  cameraTravelDistance: number;
  cloudCount: number;
  horizontalSpreadFactor: number;
  verticalSpreadFactor: number;
  fogColor: THREE.Color,
  fogNear: number;
  fogFar: number;
  scaleMin: number;
  scaleMax: number;
}

export class CloudMesh implements CloudMeshOptions {

  get cloudIncrement() {
    return ((this.cameraTravelDistance * 0.5) / this.cloudCount) * 2;
  }

  cloudCount: number;
  cameraTravelDistance: number;
  horizontalSpreadFactor: number;
  verticalSpreadFactor: number;
  fogColor: THREE.Color;
  fogNear: number;
  fogFar: number;
  scaleMin: number;
  scaleMax: number;

  #material: THREE.Material;

  constructor(options: CloudMeshOptions) {
    Object.assign(this, options)

    // texture
    const texture1 = new THREE.TextureLoader().load("rc-sky-clouds-000.png");
    texture1.magFilter = THREE.LinearFilter;
    texture1.minFilter = THREE.LinearMipmapLinearFilter;

    const texture2 = new THREE.TextureLoader().load(
      "rc-sky-clouds-001.png"
    );
    texture2.magFilter = THREE.LinearFilter;
    texture2.minFilter = THREE.LinearMipmapLinearFilter;

    // material
    // this.#material = new THREE.MeshBasicMaterial({
    //   map: texture1,
    //   side: THREE.DoubleSide,
    //   transparent: true,
    //   depthTest: false,
    //   depthWrite: false,
    // });
    // this.#material.onBeforeCompile = this.onBeforeCompileMaterial;
    this.#material = new THREE.ShaderMaterial({
      uniforms: {
        textures: { value: [texture1, texture2] },
        diffuse: { value: new THREE.Color(0xffffff) },
        opacity: { value: 1.0 },
        fogColor: { value: this.fogColor },
        fogNear: { value: this.fogNear },
        fogFar: { value: this.fogFar },
      },
      vertexShader: CloudMesh.vertexShader(),
      fragmentShader: CloudMesh.fragmentShader(),
      side: THREE.DoubleSide,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      fog: true,
    });
  }

  create(): THREE.InstancedMesh {
    const cloudCount = this.cloudCount;
    const cloudIncrement = this.cloudIncrement;
    const planeGeo = new THREE.PlaneBufferGeometry(64, 64);
    const mesh = new THREE.InstancedMesh(planeGeo, this.#material, cloudCount * 2);

    // dummy is used to easily set transforms on each mesh instance, otherwise we would need to use a matrix
    const dummy = new THREE.Object3D();

    // texture index buffer is used to swap between 2 different textures at random
    const textureIndices = [];

    // set properties for each cloud
    for (let i = 0; i < cloudCount; i++) {
      const mirrorIndex = i + cloudCount;

      // randomly pick a texture: 0 for texture A and 1 for texture B
      const textureIndex = Math.round(Math.random());
      textureIndices[i] = textureIndex;
      textureIndices[mirrorIndex] = textureIndex;

      // rotate
      dummy.rotateZ(Math.random() * Math.PI);

      // position
      const xHalf = this.horizontalSpreadFactor * 0.5;
      const x = getRandomArbitrary(-xHalf, xHalf);
      const yHalf = this.verticalSpreadFactor * 0.5;
      const y = getRandomArbitrary(-yHalf, yHalf);
      const z = cloudIncrement * i;
      dummy.position.set(x, y, z);

      // scale
      const scale = getRandomArbitrary(this.scaleMin, this.scaleMax);
      dummy.scale.set(scale, scale, 1);

      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      dummy.position.set(x, y, cloudIncrement * mirrorIndex);
      dummy.updateMatrix();
      mesh.setMatrixAt(mirrorIndex, dummy.matrix);
      mesh.instanceMatrix.needsUpdate = true;
    }

    // we sent textureIndex as an attribute to the shader
    planeGeo.setAttribute(
      "textureIndex",
      new THREE.InstancedBufferAttribute(new Float32Array(textureIndices), 1)
    );

    return mesh;
  }

  static vertexShader() {
    return `
          #include <common>
          #include <fog_pars_vertex>
          attribute float textureIndex;
    
          varying vec2 vUv;
          varying float vTextureIndex;
    
          void main() {
            vUv = uv;
    
            vec3 transformed = vec3( position );
            vec4 mvPosition = vec4( transformed, 1.0 );
            #ifdef USE_INSTANCING
              mvPosition = instanceMatrix * mvPosition;
            #endif
            mvPosition = modelViewMatrix * mvPosition;
            gl_Position = projectionMatrix * mvPosition;
    
            vFogDepth = - mvPosition.z;
            vTextureIndex = textureIndex;
          }
        `;
  }

  static fragmentShader() {
    return `
          #include <common>
          #include <fog_pars_fragment>
          varying vec2 vUv;
          varying float vTextureIndex;
    
          uniform vec3 diffuse;
          uniform float opacity;
          uniform sampler2D textures[2];
          uniform float alphaTest;
    
          void main() {
            vec4 diffuseColor = vec4( diffuse, opacity );
    
            vec4 sampledDiffuseColor;
            float x = vTextureIndex;
            sampledDiffuseColor = texture2D(textures[0], vUv) * step(-0.1, x) * step(x, 0.1);
            sampledDiffuseColor += texture2D(textures[1], vUv) * step(0.9, x) * step(x, 1.1);
    
            diffuseColor *= sampledDiffuseColor;
    
            if (diffuseColor.a < alphaTest) discard;

            ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
            reflectedLight.indirectDiffuse += vec3( 1.0 );
            reflectedLight.indirectDiffuse *= diffuseColor.rgb;
            vec3 outgoingLight = reflectedLight.indirectDiffuse;

            #include <output_fragment>
            #include <encodings_fragment>
            #include <fog_fragment>
            
            // fade if close to camera
            gl_FragColor.a *= pow(gl_FragCoord.z, 100.0);

          }
        `;
  }
}
