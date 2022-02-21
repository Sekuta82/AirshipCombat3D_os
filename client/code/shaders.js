(function (app) {

    app.get_terrainMaterial = function () {
        var material = new THREE.RawShaderMaterial({
            side: THREE.FrontSide,
            fog: true,
            defines: {
                Reflections: false,
                Emissive: false,
                DecalShadows: false
            },
            uniforms: THREE.UniformsUtils.merge([

                THREE.UniformsLib["envmap"],
                THREE.UniformsLib["fog"],
                {
                    "shift": { value: new THREE.Vector2() },
                    "worldRotation": { value: 0.0 },
                    "colorMap": { value: new THREE.TextureLoader() },
                    "heightMap": { value: new THREE.TextureLoader() },
                    "decalMap": { value: new THREE.TextureLoader() },
                    "decalMap_scale": { value: 1.0 }
                },
            ]),
            vertexShader: [
                `precision highp float;
                attribute vec3 position;
                attribute vec3 normal;
                uniform vec3 cameraPosition;
                uniform mat4 modelMatrix;
                uniform mat4 modelViewMatrix;
                uniform mat4 projectionMatrix;
                uniform mat4 viewMatrix;
                uniform vec2 shift;
                uniform float worldRotation;
                uniform float decalMap_scale;
                uniform sampler2D heightMap;
                varying highp vec2 vUv;
                varying highp vec2 vUv_decal;
                varying highp vec3 vReflect;
                varying highp float fogDepth;
                mat2 rotate2d(float angle){
                  return mat2(cos(angle),-sin(angle),
                     sin(angle),cos(angle));
                }
                void main() {
                  vec4 worldPosition = modelMatrix * vec4( position, 1.0 );
                  vec2 worldspace_uv = vec2(-worldPosition.x, worldPosition.z) * 0.000333333 + vec2(0.5, 0.5); // world space UVs

                  #ifdef DecalShadows
                  // compensate for worldspace uv rotation and shift
                  vec2 decalUV = worldspace_uv - vec2(0.5); //move rotation center to center of object
                  decalUV -= shift; // movement uv shift
                  decalUV = rotate2d(-worldRotation) * decalUV;
                  decalUV += vec2(0.5); // move uv back to origin
                  
                  vUv_decal = decalUV * vec2(decalMap_scale) - vec2((decalMap_scale - 1.0) * 0.5, decalMap_scale * 0.5);
                  #endif

                  #ifdef Reflections
                  vec3 cameraToVertex;
                  cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
                  vec3 worldNormal = normalize ( mat3( modelMatrix[0].xyz, modelMatrix[1].xyz, modelMatrix[2].xyz ) * normal );
                  vReflect = reflect( cameraToVertex, worldNormal );
                  #endif

                  vUv = worldspace_uv;
                  float heightTex = texture2D(heightMap,vUv).x;
                  vec3 displacedPosition = vec3(position.x,heightTex,position.z);
                  vec4 mvPosition = modelViewMatrix * vec4( displacedPosition, 1.0 );
                  gl_Position = projectionMatrix * mvPosition;
                  fogDepth = -mvPosition.z;
                }`
            ].join("\n"),
            fragmentShader: [
                `precision highp float;
                uniform sampler2D colorMap;
                uniform sampler2D heightMap; // r: height; g: reflection; b: emissive
                uniform sampler2D decalMap;
                uniform vec3 fogColor;
                uniform float fogNear;
                uniform float fogFar;
                uniform samplerCube envMap;
                varying highp vec2 vUv;
                varying highp vec2 vUv_decal;
                varying highp vec3 vReflect;
                varying highp float fogDepth;
                void main( void ) {
                  vec3 color = texture2D(colorMap,vUv).xyz;

                  #ifdef DecalShadows
                  vec3 decal = texture2D(decalMap,vUv_decal).xyz;
                  #endif

                  vec2 masks = texture2D(heightMap,vUv).gb;
                  #ifdef DecalShadows
                  masks.x *= 1.0 - (decal.r + decal.g);
                  #endif
                  vec3 finalColor = color;

                  #ifdef Reflections
                  vec4 envColor = textureCube( envMap, vReflect );
                  finalColor += envColor.xyz * vec3(masks.x * 0.7);
                  #endif

                  #ifdef DecalShadows
                  finalColor *= vec3(1.0 - (decal.r + decal.g) * 0.7 * (1.0 - masks.y)); // don't darken emissive parts
                  #endif

                  gl_FragColor = vec4( finalColor, 1.0 );
                  //gl_FragColor.rgb += decal.rgb; //shadow debug
                  float fogFactor = smoothstep( fogNear, fogFar, fogDepth );

                  vec3 finalFogColor = fogColor;
                  #ifdef Emissive
                    finalFogColor += color * masks.y; // glow in distance
                  #endif

                  gl_FragColor.rgb = mix( gl_FragColor.rgb, finalFogColor, fogFactor );
                }`
            ].join("\n")
        });

        return material;
    }

    var decals_vertex = `
        vec2 decal_uv = vec2(origin.x - worldPosition.x, worldPosition.z - origin.y) * 0.000333333 + vec2(0.5, 0.5); // world space UVs
        vUv_decal = decal_uv * vec2(decalMap_scale) - vec2((decalMap_scale - 1.0) * 0.5, decalMap_scale * 0.5);
        // R: player; G: fortresses/ships; B: tunnels/caves
        if (decal_channels == 0) {
        vDecal_channel_vector = vec3(0.0, 0.0, 0.0);
        } else if (decal_channels == 1) {
        vDecal_channel_vector = vec3(0.7, 0.0, 0.0);
        } else if (decal_channels == 2) {
        vDecal_channel_vector = vec3(0.7, 0.5, 0.0);
        } else if (decal_channels == 3) {
        vDecal_channel_vector = vec3(0.7, 0.5, 0.5);
        } else if (decal_channels == 4) {
        vDecal_channel_vector = vec3(0.0, 0.5, 0.6);
        } else if (decal_channels == 5) {
        vDecal_channel_vector = vec3(0.0, 0.0, 0.6);
        } else if (decal_channels == 6) {
        vDecal_channel_vector = vec3(0.7, 0.0, 0.6);
        }
        vec2 rotatedUV = vUv_decal - vec2(0.5, 0.0); //move rotation center to center of object
        rotatedUV = rotate2d(worldRotation) * rotatedUV;
        rotatedUV += vec2(0.5, 0.0); // move uv back to origin
        vUv_decal = rotatedUV;
    `;

    var phong_struct = `
    struct DirectionalLight {
        vec3 direction;
        vec3 color;
    };
    struct GeometricContext {
        vec3 position;
        vec3 normal;
        vec3 viewDir;
    };
    struct IncidentLight {
        vec3 color;
        vec3 direction;
        bool visible;
    };
    struct BlinnPhongMaterial {
        vec3	diffuseColor;
        vec3	specularColor;
        float	specularShininess;
        float	specularStrength;
    };
    struct ReflectedLight {
        vec3 directDiffuse;
        vec3 directSpecular;
    };
    `;

    var phong_frag = `
        #define RECIPROCAL_PI 0.31830988618
        #define saturate(a) clamp( a, 0.0, 1.0 )
        uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
        void getDirectionalDirectLightIrradiance( const in DirectionalLight directionalLight, const in GeometricContext geometry, out IncidentLight directLight ) {
            directLight.color = directionalLight.color;
            directLight.direction = directionalLight.direction;
            directLight.visible = true;
        }
        vec3 BRDF_Diffuse_Lambert( const in vec3 diffuseColor ) {
            return RECIPROCAL_PI * diffuseColor;
        }
        vec3 F_Schlick( const in vec3 specularColor, const in float dotLH ) {
            float fresnel = exp2( ( -5.55473 * dotLH - 6.98316 ) * dotLH );
            return ( 1.0 - specularColor ) * fresnel + specularColor;
        }
        float G_BlinnPhong_Implicit( /* const in float dotNL, const in float dotNV */ ) {
            return 0.25;
        }
        float D_BlinnPhong( const in float shininess, const in float dotNH ) {
            return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
        }
        vec3 BRDF_Specular_BlinnPhong( const in IncidentLight incidentLight, const in GeometricContext geometry, const in vec3 specularColor, const in float shininess ) {
            vec3 halfDir = normalize( incidentLight.direction + geometry.viewDir );
            float dotNH = saturate( dot( geometry.normal, halfDir ) );
            float dotLH = saturate( dot( incidentLight.direction, halfDir ) );
            vec3 F = F_Schlick( specularColor, dotLH );
            float G = G_BlinnPhong_Implicit( /* dotNL, dotNV */ );
            float D = D_BlinnPhong( shininess, dotNH );
            return F * ( G * D );
        }
        void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in GeometricContext geometry, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
            float dotNL = saturate( dot( geometry.normal, directLight.direction ) );
            vec3 irradiance = dotNL * directLight.color;
            reflectedLight.directDiffuse += irradiance * BRDF_Diffuse_Lambert( material.diffuseColor );
            reflectedLight.directSpecular += irradiance * BRDF_Specular_BlinnPhong( directLight, geometry, material.specularColor, material.specularShininess ) * material.specularStrength;
        }
      `;

    app.get_phongMaterial = function () {
        var material = new THREE.RawShaderMaterial({
            side: THREE.FrontSide,
            fog: true,
            lights: true,
            defines: {
                Reflections: false,
                DecalShadows: false,
                EmissiveMap: false,
                SecondMap: false,
                Highlight: false,
                TextureShift: false,
                Halo: false
            },
            uniforms: THREE.UniformsUtils.merge([

                THREE.UniformsLib["envmap"],
                THREE.UniformsLib["fog"],
                THREE.UniformsLib["lights"],
                {
                    "diffuse": { value: new THREE.Color(0xffffff) },
                    "specular": { value: new THREE.Color(0xffffff) },
                    "shininess": { value: 10.0 },
                    "origin": { value: new THREE.Vector2() },
                    "worldRotation": { value: 0.0 },
                    "colorMap": { value: new THREE.TextureLoader() },
                    "secondMap": { value: new THREE.TextureLoader() },
                    "emissiveMap": { value: new THREE.TextureLoader() },
                    "emissive_channel": { value: 0 },
                    "decalMap": { value: new THREE.TextureLoader() },
                    "decalMap_scale": { value: 1.0 },
                    "decal_channels": { value: 1.0 },
                    "hightlight_time": { value: 0.0 },
                    "shift_time": { value: 0.0 },
                    "whiteOut": { value: false },
                    "haloColor": { value: new THREE.Color(0xffffff) },
                },
            ]),
            vertexShader: [
                `precision highp float;
                attribute vec3 position;
                attribute vec3 normal;
                attribute vec2 uv;
                attribute vec2 uv2;
                uniform vec3 cameraPosition;
                uniform mat4 modelMatrix;
                uniform mat4 modelViewMatrix;
                uniform mat3 normalMatrix;
                uniform mat4 projectionMatrix;
                uniform mat4 viewMatrix;
                uniform vec2 origin;
                uniform float worldRotation;
                uniform float decalMap_scale;
                uniform int decal_channels;
                uniform float shift_time;
                varying highp vec2 vUv;
                varying highp vec2 vUv_second;
                varying highp vec2 vUv_decal;
                varying highp vec3 vDecal_channel_vector;
                varying highp float vFresnel;
                varying highp vec3 vReflect;
                varying highp vec3 vViewPosition;
                varying highp vec3 vNormal;
                varying highp float fogDepth;
                mat2 rotate2d(float angle){
                  return mat2(cos(angle),-sin(angle),
                     sin(angle),cos(angle));
                }
                void main() {
                  vec4 worldPosition = modelMatrix * vec4( position, 1.0 );
                  vUv = uv;
                  vUv_second = uv2;
                  #ifdef TextureShift
                  vUv.y += shift_time;
                  #endif

                  #ifdef DecalShadows
                  `+ decals_vertex + `
                  #endif
                  #if defined (Reflections) || defined (Halo)
                  vec3 cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
                  vec3 worldNormal = normalize ( mat3( modelMatrix[0].xyz, modelMatrix[1].xyz, modelMatrix[2].xyz ) * normal );
                  vReflect = reflect( cameraToVertex, worldNormal );
                  #endif
                  vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
                  gl_Position = projectionMatrix * mvPosition;
                  vViewPosition = -mvPosition.xyz;
                  vNormal = normalMatrix * vec3(normal);
                  fogDepth = -mvPosition.z;
                  #ifdef Halo
                  vFresnel = abs(dot( cameraToVertex, worldNormal )) * 2.0;
                  #endif
                }`
            ].join("\n"),
            fragmentShader: [
                `precision lowp float;
                `+ phong_struct + `

                uniform sampler2D colorMap;
                #ifdef SecondMap
                uniform sampler2D secondMap;
                #endif
                #ifdef EmissiveMap
                uniform sampler2D emissiveMap;
                uniform int emissive_channel;
                #endif

                uniform sampler2D decalMap;
                uniform vec3 fogColor;
                uniform float fogNear;
                uniform float fogFar;
                uniform vec3 ambientLightColor;
                uniform vec3 diffuse;
                uniform vec3 specular;
                uniform float shininess;
                uniform samplerCube envMap;
                uniform float hightlight_time;
                uniform bool whiteOut;
                varying highp vec2 vUv;
                varying highp vec2 vUv_second;
                varying highp vec2 vUv_decal;
                varying highp vec3 vDecal_channel_vector;
                varying highp vec3 vReflect;
                varying highp vec3 vViewPosition;
                varying highp vec3 vNormal;
                varying highp float fogDepth;

                #ifdef Halo
                uniform vec3 haloColor;
                varying highp float vFresnel;
                #endif

                `+ phong_frag + `

                void main( void ) {
                  float specularStrength = 1.0;
                  ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ) );
                  BlinnPhongMaterial material;
                  material.diffuseColor = diffuse;
                  material.specularColor = specular;
                  material.specularShininess = shininess;
                  material.specularStrength = specularStrength;
                  GeometricContext geometry;
                  geometry.position = - vViewPosition;
                  geometry.normal = vNormal;
                  geometry.viewDir = normalize( vViewPosition );
                  IncidentLight directLight;
                  DirectionalLight directionalLight;
                  #pragma unroll_loop_start
                  for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
                      directionalLight = directionalLights[ i ];
                      getDirectionalDirectLightIrradiance( directionalLight, geometry, directLight );
                      RE_Direct_BlinnPhong( directLight, geometry, material, reflectedLight );
                  }
                  #pragma unroll_loop_end
                  vec4 color = texture2D(colorMap,vUv);
                  vec3 finalColor = color.rgb;

                  #ifdef SecondMap
                  float ao = texture2D(secondMap,vUv_second).x;
                  float ao_double = ao * 2.0;
                  float ao_highlight = max(ao - 0.5,0.0);

                  vec2 masks = texture2D(secondMap,vUv).yz; // G: reflection; B: light
                  
                  finalColor *= vec3(ao_double);
                  finalColor += ao_highlight;
                  #endif
                  
                  #ifdef EmissiveMap
                  vec4 emissive_tex = texture2D(emissiveMap,vUv);
                  float emissive;
                  if (emissive_channel == 0) {
                    emissive = emissive_tex.r;
                  } else if (emissive_channel == 1) {
                    emissive = emissive_tex.g;
                  } else if (emissive_channel == 2) {
                    emissive = emissive_tex.b;
                  } else if (emissive_channel == 3) {
                    emissive = emissive_tex.a;
                  }
                  #endif
                  
                  #ifdef Reflections
                  vec4 envColor = textureCube( envMap, vReflect );
                    #ifdef SecondMap
                    finalColor += envColor.xyz * vec3((masks.x + ao_highlight) * 2.0);
                    #else
                    finalColor += envColor.xyz * vec3(color.a * 2.0);
                    #endif
                  #endif
            
                  finalColor *= diffuse * (ambientLightColor + reflectedLight.directDiffuse);
                  
                  float specularMask;
                  #ifdef Reflections
                    #ifdef SecondMap
                    specularMask = masks.x;
                    #else
                    specularMask = color.a;
                    #endif
                    finalColor += reflectedLight.directSpecular * specularMask;
                  #else
                    finalColor += reflectedLight.directSpecular * 0.3;
                  #endif
                  
                  #if defined (SecondMap)
                  finalColor = mix(finalColor,color.rgb,masks.y);
                  #elif defined(EmissiveMap)
                  finalColor = mix(finalColor,color.rgb,emissive);
                  #endif

                  #ifdef DecalShadows
                  vec3 decal = texture2D(decalMap,vUv_decal).xyz;
                  vec3 decal_multiplied = decal * vDecal_channel_vector;
                  finalColor *= vec3(1.0 - (decal_multiplied.r + max(decal_multiplied.g, decal_multiplied.b)));
                  #endif
                  
                  #ifdef Highlight
                  vec3 highlight_offset;
                  vec2 uv_highlight = vUv * vec2(30.0);
                  float highlight_progress = mod(hightlight_time,6.28) * 5.0;
                  highlight_offset.r = max(0.0,sin((uv_highlight.y + 0.0 - highlight_progress)));
                  highlight_offset.g = max(0.0,sin((uv_highlight.y + 0.5 - highlight_progress)));
                  highlight_offset.b = max(0.0,sin((uv_highlight.y + 1.0 - highlight_progress)));
                  highlight_offset = abs(highlight_offset);
                  vec3 highlight_color;
                  highlight_color = (vec3(1.0) - color.rgb) * highlight_offset;
                  finalColor += highlight_color;
                  #endif
                  
                  if(whiteOut) {
                    finalColor = vec3(1.0);
                  }
                  gl_FragColor = vec4(finalColor, 1.0 );
                  //gl_FragColor.rgb += decal.rgb * vDecal_channel_vector; //shadow debug
                  float fogFactor = smoothstep( fogNear, fogFar, fogDepth );

                  vec3 finalFogColor = fogColor;
                  #ifdef EmissiveMap
                    finalFogColor += color.rgb * emissive * 0.5; // glow in distance
                  #endif
                  gl_FragColor.rgb = mix( gl_FragColor.rgb, finalFogColor, fogFactor );

                  #ifdef Halo
                  gl_FragColor.rgb += mix(vec3(2.0), haloColor, vFresnel * 1.5) * vec3(vFresnel) * vec3(1.0 - clamp(0.0,1.0,vFresnel));
                  #endif
                }`
            ].join("\n")
        });

        return material;
    }

    app.get_lindwormMaterial = function () {
        var material = new THREE.RawShaderMaterial({
            side: THREE.FrontSide,
            fog: true,
            lights: true,
            defines: {
                Reflections: false
            },
            uniforms: THREE.UniformsUtils.merge([

                THREE.UniformsLib["envmap"],
                THREE.UniformsLib["fog"],
                THREE.UniformsLib["lights"],
                {
                    "diffuse": { value: new THREE.Color(0xffffff) },
                    "specular": { value: new THREE.Color(0xffffff) },
                    "shininess": { value: 10.0 },
                    "origin": { value: new THREE.Vector2() },
                    "worldRotation": { value: 0.0 },
                    "colorMap": { value: new THREE.TextureLoader() },
                    "reflectionMap": { value: new THREE.TextureLoader() },
                    "rotation_progress": { value: 0.0 },
                    "explosion_progress": { value: 0.0 },
                    "whiteOut": { value: false }
                },
            ]),
            vertexShader: [
                `precision highp float;
                attribute vec3 position;
                attribute vec3 normal;
                attribute vec2 uv;
                attribute vec2 uv2;
                uniform vec3 cameraPosition;
                uniform mat4 modelMatrix;
                uniform mat4 modelViewMatrix;
                uniform mat3 normalMatrix;
                uniform mat4 projectionMatrix;
                uniform mat4 viewMatrix;
                uniform float rotation_progress;
                uniform float explosion_progress;
                varying highp vec2 vUv;
                varying highp vec2 vUv_second;
                varying highp vec3 vReflect;
                varying highp vec3 vViewPosition;
                varying highp vec3 vNormal;
                varying highp float fogDepth;
                mat2 rotate2d(float angle){
                  return mat2(cos(angle),-sin(angle),
                     sin(angle),cos(angle));
                }
                void main() {
                  vec4 worldPosition = modelMatrix * vec4( position, 1.0 );
                  vUv = uv;
                  vUv_second = uv2;

                  #ifdef Reflections
                  vec3 cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
                  vec3 worldNormal = normalize ( mat3( modelMatrix[0].xyz, modelMatrix[1].xyz, modelMatrix[2].xyz ) * normal );
                  vReflect = reflect( cameraToVertex, worldNormal );
                  #endif
                  
                  float wiggle_multiplier;
                  float wiggle_offset;
                  float wiggle;
                  if (rotation_progress > 0.0) {
                    wiggle_multiplier = mix(5.0,20.0,rotation_progress);
                    wiggle_offset = mix(40.0,2.0,rotation_progress);
                    wiggle = uv2.x * sin((rotation_progress + uv2.x) * wiggle_multiplier) * wiggle_offset;
                  }

                  vec3 explosion_offst;
                  if (explosion_progress > 0.0) {
                      explosion_offst = vec3(normal * 30.0 * explosion_progress * max(0.6,fract(sin(position.y*position.z))));
                  } 

                  vec4 mvPosition = modelViewMatrix * vec4( vec3(position.x + wiggle, position.y, position.z) + explosion_offst, 1.0 );
                  gl_Position = projectionMatrix * mvPosition;
                  vViewPosition = -mvPosition.xyz;
                  vNormal = normalMatrix * vec3(normal);
                  fogDepth = -mvPosition.z;
                }`
            ].join("\n"),
            fragmentShader: [
                `precision lowp float;
                `+ phong_struct + `

                uniform sampler2D colorMap;
                uniform sampler2D reflectionMap;
                
                uniform vec3 fogColor;
                uniform float fogNear;
                uniform float fogFar;
                uniform vec3 ambientLightColor;
                uniform vec3 diffuse;
                uniform vec3 specular;
                uniform float shininess;
                uniform samplerCube envMap;
                uniform bool whiteOut;
                varying highp vec2 vUv;
                varying highp vec2 vUv_second;
                varying highp vec3 vReflect;
                varying highp vec3 vViewPosition;
                varying highp vec3 vNormal;
                varying highp float fogDepth;

                `+ phong_frag + `

                void main( void ) {
                  float specularStrength = 1.0;
                  ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ) );
                  BlinnPhongMaterial material;
                  material.diffuseColor = diffuse;
                  material.specularColor = specular;
                  material.specularShininess = shininess;
                  material.specularStrength = specularStrength;
                  GeometricContext geometry;
                  geometry.position = - vViewPosition;
                  geometry.normal = vNormal;
                  geometry.viewDir = normalize( vViewPosition );
                  IncidentLight directLight;
                  DirectionalLight directionalLight;
                  #pragma unroll_loop_start
                  for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
                      directionalLight = directionalLights[ i ];
                      getDirectionalDirectLightIrradiance( directionalLight, geometry, directLight );
                      RE_Direct_BlinnPhong( directLight, geometry, material, reflectedLight );
                    }
                  #pragma unroll_loop_end
                  vec4 color = texture2D(colorMap,vUv);
                  float refMask = texture2D(reflectionMap,vUv).r;
                  
                  vec3 finalColor = color.rgb;
                  
                  #ifdef Reflections
                  vec4 envColor = textureCube( envMap, vReflect );
                  finalColor += envColor.xyz * vec3(refMask);
                  #endif
            
                  finalColor *= diffuse * (ambientLightColor + reflectedLight.directDiffuse);
                  
                  float specularMask;
                  #ifdef Reflections
                  specularMask = color.a;
                  finalColor += reflectedLight.directSpecular * specularMask;
                  #else
                  finalColor += reflectedLight.directSpecular * 0.3;
                  #endif
                
                  if(whiteOut) {
                    finalColor = vec3(1.0);
                  }
                  gl_FragColor = vec4(finalColor, 1.0 );
                  float fogFactor = smoothstep( fogNear, fogFar, fogDepth );

                  vec3 finalFogColor = fogColor;
                  gl_FragColor.rgb = mix( gl_FragColor.rgb, finalFogColor, fogFactor );
                }`
            ].join("\n")
        });

        return material;
    }

    app.get_lindworm_sandMaterial = function () {
        var material = new THREE.RawShaderMaterial({
            side: THREE.DoubleSide,
            fog: true,
            transparent: true,
            depthWrite: false,
            uniforms: THREE.UniformsUtils.merge([

                THREE.UniformsLib["fog"],
                {
                    "diffuse": { value: new THREE.Color(0xffffff) },
                    "colorMap": { value: new THREE.TextureLoader() },
                    "rotation_progress": { value: 0.0 },
                    "shift_time": { value: 0.0 },
                    "explosion_progress": { value: 0.0 }
                },
            ]),
            vertexShader: [
                `precision highp float;
                attribute vec3 position;
                attribute vec3 normal;
                attribute vec2 uv;
                attribute vec2 uv2;
                uniform vec3 cameraPosition;
                uniform mat4 modelMatrix;
                uniform mat4 modelViewMatrix;
                uniform mat4 projectionMatrix;
                uniform float rotation_progress;
                uniform float explosion_progress;
                uniform float shift_time;
                varying highp vec2 vUv;
                varying highp vec2 vUv_second;
                varying highp float vFresnel;
                varying highp float fogDepth;
                void main() {
                  vec4 worldPosition = modelMatrix * vec4( position, 1.0 );
                  vUv = uv;
                  //vUv.x *= 3.0;
                  vUv_second = uv2;
                  vUv.y -= shift_time;

                  float wiggle_multiplier;
                  float wiggle_offset;
                  float wiggle;
                  if (rotation_progress > 0.0) {
                    wiggle_multiplier = mix(5.0,20.0,rotation_progress);
                    wiggle_offset = mix(40.0,2.0,rotation_progress);
                    wiggle = uv2.x * sin((rotation_progress + uv2.x) * wiggle_multiplier) * wiggle_offset;
                  }

                  vec3 explosion_offst;
                  if (explosion_progress > 0.0) {
                      explosion_offst = vec3(normal * 50.0 * explosion_progress * max(0.6,fract(sin(position.y*position.z))));
                  } 

                  vec4 mvPosition = modelViewMatrix * vec4( vec3(position.x + wiggle, position.y, position.z) + explosion_offst, 1.0 );
                  gl_Position = projectionMatrix * mvPosition;

                  vec3 worldNormal = normalize( mat3( modelMatrix[0].xyz, modelMatrix[1].xyz, modelMatrix[2].xyz ) * normal );
                  vec3 I = worldPosition.xyz - cameraPosition;
                  vFresnel = abs(dot( normalize( I ), worldNormal )) * 2.0;

                  fogDepth = -mvPosition.z;
                }`
            ].join("\n"),
            fragmentShader: [
                `precision lowp float;
                `+ phong_struct + `

                uniform sampler2D colorMap;

                uniform vec3 fogColor;
                uniform float fogNear;
                uniform float fogFar;
                uniform vec3 diffuse;
                varying highp vec2 vUv;
                varying highp vec2 vUv_second;
                varying highp float vFresnel;
                varying highp float fogDepth;

                `+ phong_frag + `

                void main( void ) {
                  float color = texture2D(colorMap,vUv).r;
                  vec3 finalColor = mix(diffuse,diffuse * vec3(2.0),color);
                  
                  gl_FragColor = vec4(finalColor, 1.0 );
                  float fogFactor = smoothstep( fogNear, fogFar, fogDepth );

                  float alpha = color * 0.8;

                  vec3 finalFogColor = fogColor;
                  gl_FragColor.rgb = mix( gl_FragColor.rgb, finalFogColor, fogFactor );
                  gl_FragColor.a = alpha * vUv_second.y * vFresnel;
                }`
            ].join("\n")
        });

        return material;
    }

    app.get_particleMaterial = function () {
        var material = new THREE.RawShaderMaterial({
            side: THREE.DoubleSide,
            fog: true,
            transparent: true,
            depthWrite: false,
            uniforms: THREE.UniformsUtils.merge([
                THREE.UniformsLib["fog"],
                {
                    "diffuse": { value: new THREE.Color(0xffffff) },
                    "colorMap": { value: new THREE.TextureLoader() },
                    "atlas_columns": { value: 1.0 },
                    "atlas_rows": { value: 1.0 },
                    "atlas_index": { value: 0.0 },
                    "rotation": { value: 0.0 }
                },
            ]),
            vertexShader: [
                `precision highp float;
                attribute vec3 position;
                attribute vec2 uv;
                uniform vec3 cameraPosition;
                uniform mat4 modelMatrix;
                uniform mat4 modelViewMatrix;
                uniform mat4 projectionMatrix;
                uniform mat4 viewMatrix;
                uniform float atlas_columns;
                uniform float atlas_rows;
                uniform float atlas_index;
                uniform float rotation;
                varying highp vec2 vUv;
                varying highp float fogDepth;

                mat2 rotate2d(float angle){
                  return mat2(cos(angle),-sin(angle),
                     sin(angle),cos(angle));
                }

                void main() {
                    // atlas uv
                    vec2 atlasPos = uv;
                    vec2 atlasSteps = vec2((1.0 / atlas_columns),(1.0 / atlas_rows));
                    atlasPos.x = (atlasPos.x / atlas_columns) + (atlasSteps.x * mod(atlas_index,atlas_columns));
                    atlasPos.y = (atlasPos.y / atlas_rows) + (atlasSteps.y * (atlas_rows - 1.0)) - (atlasSteps.y * floor((atlas_index) / atlas_columns));
                    vUv = atlasPos;
                    
                    // billboard
                    vec2 scale = vec2(
                    length(modelViewMatrix[0]), // magnitude of first column for scale x
                    length(modelViewMatrix[1])  // magnitude of second column for scale y
                    );
                    vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
                    gl_Position = projectionMatrix * (modelViewMatrix * vec4(vec3(0.0), 1.0) + vec4(scale * position.xy * rotate2d(rotation), 0.0, 0.0));
                    fogDepth = -mvPosition.z;
                }`
            ].join("\n"),
            fragmentShader: [
                `precision lowp float;
                uniform sampler2D colorMap;
                uniform vec3 diffuse;
                uniform vec3 fogColor;
                uniform float fogNear;
                uniform float fogFar;
                varying highp vec2 vUv;
                varying highp float fogDepth;
                void main( void ) {
                    vec4 color = texture2D(colorMap,vUv);

                    gl_FragColor = color * vec4(diffuse, 1.0);

                    float fogFactor = smoothstep( fogNear, fogFar, fogDepth );
                    gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
                }`
            ].join("\n")
        });

        return material;
    }

    app.get_decalMaterial = function () {
        var material = new THREE.RawShaderMaterial({
            blending: THREE.AdditiveBlending,
            fog: false,
            transparent: true,
            depthWrite: false,
            uniforms: THREE.UniformsUtils.merge([
                {
                    "diffuse": { value: new THREE.Color(0xffffff) },
                    "colorMap": { value: new THREE.TextureLoader() },
                },
            ]),
            vertexShader: [
                `precision highp float;
                attribute vec3 position;
                attribute vec2 uv;
                uniform vec3 cameraPosition;
                uniform mat4 modelMatrix;
                uniform mat4 modelViewMatrix;
                uniform mat4 projectionMatrix;
                uniform mat4 viewMatrix;
                varying highp vec2 vUv;

                void main() {
                    vUv = uv;
                    vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
                    gl_Position = projectionMatrix * mvPosition;
                }`
            ].join("\n"),
            fragmentShader: [
                `precision lowp float;
                uniform sampler2D colorMap;
                uniform vec3 diffuse;
                varying highp vec2 vUv;
                void main( void ) {
                    vec3 color = texture2D(colorMap,vUv).rgb;

                    gl_FragColor.rgb = color * diffuse;
                    gl_FragColor.a = 1.0;
                }`
            ].join("\n")
        });

        return material;
    }

    app.get_lindwormDecalMaterial = function () {
        var material = new THREE.RawShaderMaterial({
            blending: THREE.AdditiveBlending,
            fog: false,
            transparent: true,
            depthWrite: false,
            uniforms: THREE.UniformsUtils.merge([
                {
                    "diffuse": { value: new THREE.Color(0xffffff) },
                    "colorMap": { value: new THREE.TextureLoader() },
                    "rotation_progress": { value: 0.0 }
                },
            ]),
            vertexShader: [
                `precision highp float;
                attribute vec3 position;
                attribute vec2 uv;
                uniform vec3 cameraPosition;
                uniform mat4 modelMatrix;
                uniform mat4 modelViewMatrix;
                uniform mat4 projectionMatrix;
                uniform mat4 viewMatrix;
                varying highp vec2 vUv;

                void main() {
                    vUv = uv;
                    vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
                    gl_Position = projectionMatrix * mvPosition;
                }`
            ].join("\n"),
            fragmentShader: [
                `precision lowp float;
                uniform sampler2D colorMap;
                uniform vec3 diffuse;
                uniform float rotation_progress;
                varying highp vec2 vUv;
                void main( void ) {
                    vec3 color = texture2D(colorMap,vUv).rgb;

                    float progress_in = rotation_progress * 1.2 + 0.2;
                    float fading_in = min((1.0 - (vUv.y - progress_in) * 5.0) * smoothstep(0.0,0.1,rotation_progress), 1.0);

                    float progress_out = rotation_progress * 1.1 - 0.5;
                    float fading_out = min((vUv.y - progress_out) * 5.0 * smoothstep(1.0,0.95,rotation_progress), 1.0);

                    float fading = fading_in * fading_out;

                    gl_FragColor.rgb = color * diffuse * vec3(fading);
                    //gl_FragColor.rgb = vec3(fading);
                    gl_FragColor.a = 1.0;
                }`
            ].join("\n")
        });

        return material;
    }

    app.get_cloudMaterial = function () {
        var material = new THREE.RawShaderMaterial({
            side: THREE.DoubleSide,
            transparent: true,
            depthWrite: false,
            uniforms: THREE.UniformsUtils.merge([
                {
                    "shift": { value: new THREE.Vector2() },
                    "diffuse": { value: new THREE.Color(0xffffff) },
                    "opacity": { value: 1.0 },
                    "colorMap": { value: new THREE.TextureLoader() },
                    "gain": { value: 1.0 },
                    "bias": { value: 0.0 }
                },
            ]),
            vertexShader: [
                `precision highp float;
                attribute vec3 position;
                attribute vec2 uv;
                uniform vec3 cameraPosition;
                uniform mat4 modelMatrix;
                uniform mat4 modelViewMatrix;
                uniform mat4 projectionMatrix;
                uniform mat4 viewMatrix;
                uniform vec2 shift;
                varying highp vec2 vUv;

                void main() {
                    vUv = uv;
                    vUv -= shift; // movement uv shift
                    
                    vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
                    gl_Position = projectionMatrix * mvPosition;
                }`
            ].join("\n"),
            fragmentShader: [
                `precision lowp float;
                uniform sampler2D colorMap;
                uniform vec3 diffuse;
                uniform float gain;
                uniform float bias;
                uniform float opacity;
                varying highp vec2 vUv;

                void main( void ) {
                    float color = texture2D(colorMap,vUv).r;
                    color = smoothstep(bias, gain + bias, color);
                    gl_FragColor = vec4(diffuse, color * opacity);
                }`
            ].join("\n")
        });

        return material;
    }

    app.get_rocketMaterial = function () {
        var material = new THREE.RawShaderMaterial({
            fog: true,
            transparent: true,
            depthWrite: false,
            uniforms: THREE.UniformsUtils.merge([
                THREE.UniformsLib["fog"],
                {
                    "exposure": { value: 1.0 },
                    "diffuse": { value: new THREE.Color(0xffffff) },
                    "colorMap": { value: new THREE.TextureLoader() }
                },
            ]),
            vertexShader: [
                `precision highp float;
                attribute vec3 position;
                attribute vec2 uv;
                uniform vec3 cameraPosition;
                uniform mat4 modelMatrix;
                uniform mat4 modelViewMatrix;
                uniform mat4 projectionMatrix;
                uniform mat4 viewMatrix;
                varying highp vec2 vUv;
                varying highp float fogDepth;

                void main() {
                    vUv = uv;
                    
                    // billboard
                    vec2 scale = vec2(
                    length(modelViewMatrix[0]), // magnitude of first column for scale x
                    length(modelViewMatrix[1])  // magnitude of second column for scale y
                    );
                    vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
                    gl_Position = projectionMatrix * (modelViewMatrix * vec4(vec3(0.0), 1.0) + vec4(scale * position.xy, 0.0, 0.0));
                    fogDepth = -mvPosition.z;
                }`
            ].join("\n"),
            fragmentShader: [
                `precision lowp float;
                uniform sampler2D colorMap;
                uniform vec3 diffuse;
                uniform float exposure;
                uniform vec3 fogColor;
                uniform float fogNear;
                uniform float fogFar;
                varying highp vec2 vUv;
                varying highp float fogDepth;
                void main( void ) {
                    vec4 color = texture2D(colorMap,vUv);

                    gl_FragColor = color * vec4(diffuse * vec3(exposure), 1.0);

                    float fogFactor = smoothstep( fogNear, fogFar, fogDepth );
                    gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
                }`
            ].join("\n")
        });

        return material;
    }

    app.get_portalMaterial = function () {
        var material = new THREE.RawShaderMaterial({
            fog: false,
            transparent: true,
            depthWrite: false,
            defines: {
                JetMode: false
            },
            uniforms: THREE.UniformsUtils.merge([
                {
                    "diffuse": { value: new THREE.Color(0xffffff) },
                    "colorMap": { value: new THREE.TextureLoader() },
                    "time": { value: 0.0 },
                    "speed": { value: 0.0 }
                },
            ]),
            vertexShader: [
                `precision highp float;
                attribute vec3 position;
                attribute vec2 uv;
                uniform vec3 cameraPosition;
                uniform mat4 modelMatrix;
                uniform mat4 modelViewMatrix;
                uniform mat4 projectionMatrix;
                uniform mat4 viewMatrix;
                uniform sampler2D colorMap;
                uniform float time;
                uniform float speed;
                varying highp vec2 vUv;
                varying highp vec2 displace_uv;
                varying highp float fadeOut;

                void main() {
                    vUv = uv;
                    displace_uv = uv;
                    #ifdef JetMode
                        displace_uv.y += time * speed * 2.0;
                        fadeOut = (vUv.y - (1.0 - speed));
                    #else
                        displace_uv.x -= time * 0.1;
                        fadeOut = vUv.y * 4.2;
                    #endif
                    vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
                    gl_Position = projectionMatrix * mvPosition;
                }`
            ].join("\n"),
            fragmentShader: [
                `precision lowp float;
                uniform sampler2D colorMap;
                uniform vec3 diffuse;
                varying highp vec2 vUv;
                varying highp vec2 displace_uv;
                varying highp float fadeOut;
                void main( void ) {
                    #ifdef JetMode
                        float color0 = texture2D(colorMap,displace_uv).r;

                        vec3 color = vec3(color0 * 3.0);
                        color *= diffuse.rgb;

                        float alpha = fadeOut;
                    #else
                        float displace = (texture2D(colorMap,displace_uv).b - 0.5) * 0.2;
                        float color0 = texture2D(colorMap,vUv + vec2(displace,0.0)).r;
                        float color1 = texture2D(colorMap,displace_uv - vec2(color0 * 0.1,0.0)).g;
                        
                        vec3 color = vec3(color0);
                        color *= diffuse.rgb;
                        color += vec3(0.0,color1,color1 * 2.0);
                        
                        float alpha = (fadeOut - color1) * 2.0;
                    #endif

                    gl_FragColor.rgb = color;
                    gl_FragColor.a = alpha;
                }`
            ].join("\n")
        });

        return material;
    }

    return app;
}(MODULE));