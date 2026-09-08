const canvas = document.getElementById('c');
const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

if (!gl) {
  document.body.innerHTML = '<h1 style="color:red;padding:20px;position:relative;z-index:999;">WebGL not supported</h1>';
}

const vsSource = `
  attribute vec2 a_pos;
  void main() {
    gl_Position = vec4(a_pos, 0.0, 1.0);
  }
`;

// 你的原始 Shader 代码不变
const fsSource = `
  #ifdef GL_ES
  precision highp float;
  #endif

  uniform vec2 iResolution;
  uniform float iTime;

  #define NUM_LAYERS 16.0
  #define ITER 23

  vec3 tex(vec3 uvw) {
    return vec3(sin(uvw.x), cos(uvw.y), sin(uvw.z));
  }

  void main() {
    vec2 fragCoord = gl_FragCoord.xy;
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / max(iResolution.x, iResolution.y);
    vec3 col = vec3(0.0);
    
    float t = mod(iTime * 0.25, 8.0) + 78.0;
    
    for (float i = 0.0; i <= 1.0; i += 1.0 / NUM_LAYERS) {
      float d = fract(i + t);
      float s = mix(5.0, 0.5, d);
      float f = d * smoothstep(1.0, 0.9, d);
      
      vec3 p = vec3(uv * s, i * 4.0);
      vec4 o = vec4(p, 3.0 * sin(t * 0.1));
      vec4 dec = vec4(1.0, 0.9, 0.1, 0.15) + vec4(0.06 * cos(t * 0.1), 0.0, 0.0, 0.14 * cos(t * 0.23));
      
      for (int j = 0; j < ITER; j++) {
        float d2 = dot(o, o);
        if (d2 == 0.0) d2 = 0.0001;
        o.xzyw = abs(o / d2 - dec);
      }
      
      col += tex(o.xyz) * f;
    }
    
    col /= NUM_LAYERS;
    col *= vec3(2.0, 1.0, 2.0);
    col = pow(col, vec3(0.5));
    
    gl_FragColor = vec4(col, 1.0);
  }
`;

function compileShader(src, type) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(s));
    return null;
  }
  return s;
}

const prg = gl.createProgram();
gl.attachShader(prg, compileShader(vsSource, gl.VERTEX_SHADER));
gl.attachShader(prg, compileShader(fsSource, gl.FRAGMENT_SHADER));
gl.linkProgram(prg);
gl.useProgram(prg);

const buf = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, buf);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
  -1, -1,  1, -1, -1,  1,
  -1,  1,  1, -1,  1,  1
]), gl.STATIC_DRAW);

const aPos = gl.getAttribLocation(prg, 'a_pos');
gl.enableVertexAttribArray(aPos);
gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

const uRes = gl.getUniformLocation(prg, 'iResolution');
const uTime = gl.getUniformLocation(prg, 'iTime');

// 严格监听窗口大小调整，保证尺寸100%且不触发滚动
function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  gl.viewport(0, 0, canvas.width, canvas.height);
}
window.addEventListener('resize', resize);
resize();

let start = performance.now();
function render(now) {
  gl.uniform2f(uRes, canvas.width, canvas.height);
  gl.uniform1f(uTime, (now - start) * 0.001);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
  requestAnimationFrame(render);
}
requestAnimationFrame(render);