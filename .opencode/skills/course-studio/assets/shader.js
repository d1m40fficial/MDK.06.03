(function(){
  var cards = [].slice.call(document.querySelectorAll('[data-shader]'));
  if(!cards.length) return;
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var vsrc = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  var fsrc = `precision highp float;uniform vec2 u_res;uniform float u_time;
  uniform vec3 u_c1;uniform vec3 u_c2;uniform vec3 u_c3;uniform float u_seed;
  float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
    return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}
  float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*noise(p);p*=2.03;a*=.5;}return v;}
  void main(){
    vec2 uv=(gl_FragCoord.xy*2.-u_res)/min(u_res.x,u_res.y);
    uv += vec2(u_seed*1.7,u_seed*1.1);
    float t=u_time*.05+u_seed*3.0;
    vec2 q=vec2(fbm(uv*1.15+t*.7),fbm(uv*1.15-t*.5));
    float r=fbm(uv*1.4+q*1.9+vec2(t*.6,0.));
    vec3 col=vec3(.031,.035,.051);
    col=mix(col,u_c1,smoothstep(.30,.82,r)*.95);
    col=mix(col,u_c2,smoothstep(.50,.90,fbm(uv*2.1-q*1.6+t*.4))*.45);
    col=mix(col,u_c3,smoothstep(.60,.95,r+q.x*.3)*.5);
    col*=.82+.50*q.y;
    gl_FragColor=vec4(col,1.);
  }`;
  function hexRgb(hex){
    hex = String(hex||'#7C5CFF').replace('#','');
    if(hex.length === 3) hex = hex.split('').map(function(c){ return c+c; }).join('');
    var n = parseInt(hex,16);
    if(isNaN(n)) return [.486,.361,1];
    return [((n>>16)&255)/255,((n>>8)&255)/255,(n&255)/255];
  }
  function rgbHsl(c){
    var r=c[0],g=c[1],b=c[2],max=Math.max(r,g,b),min=Math.min(r,g,b),h=0,s=0,l=(max+min)/2,d=max-min;
    if(d){ s=l>.5?d/(2-max-min):d/(max+min);
      if(max===r) h=(g-b)/d+(g<b?6:0);
      else if(max===g) h=(b-r)/d+2;
      else h=(r-g)/d+4;
      h/=6; }
    return [h,s,l];
  }
  function hue(h,s,l){
    function f(n){var k=(n+h*12)%12;return l-s*Math.min(l,1-l)*Math.max(-1,Math.min(k-3,Math.min(9-k,1)));}
    return [f(0),f(8),f(4)];
  }
  function palette(hex, seed){
    var hsl=rgbHsl(hexRgb(hex)), h=(hsl[0]+(seed-.5)*.16+1)%1, s=Math.max(.6,hsl[1]);
    return [hue(h,s,.6),hue((h+.13)%1,.78,.62),hue((h+.87)%1,.72,.64)];
  }
  function shader(gl,type,src){
    var s=gl.createShader(type); gl.shaderSource(s,src); gl.compileShader(s); return s;
  }
  function init(card,index){
    var cv=card.querySelector('canvas.shader-bg'); if(!cv) return;
    var gl=null;
    try { gl=cv.getContext('webgl',{antialias:false,alpha:false,powerPreference:'low-power'}) || cv.getContext('experimental-webgl'); } catch(e) {}
    if(!gl){ return; }
    var pr=gl.createProgram();
    gl.attachShader(pr,shader(gl,gl.VERTEX_SHADER,vsrc));
    gl.attachShader(pr,shader(gl,gl.FRAGMENT_SHADER,fsrc));
    gl.linkProgram(pr); gl.useProgram(pr);
    var buf=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,buf);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,-1,1,1,-1,1]),gl.STATIC_DRAW);
    var loc=gl.getAttribLocation(pr,'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
    var uRes=gl.getUniformLocation(pr,'u_res'),uT=gl.getUniformLocation(pr,'u_time');
    var uC1=gl.getUniformLocation(pr,'u_c1'),uC2=gl.getUniformLocation(pr,'u_c2'),uC3=gl.getUniformLocation(pr,'u_c3');
    var uSeed=gl.getUniformLocation(pr,'u_seed');
    var seed=parseFloat(card.getAttribute('data-seed'))||0;
    var colors=palette(card.getAttribute('data-accent'),seed);
    gl.uniform3f(uC1,colors[0][0],colors[0][1],colors[0][2]);
    gl.uniform3f(uC2,colors[1][0],colors[1][1],colors[1][2]);
    gl.uniform3f(uC3,colors[2][0],colors[2][1],colors[2][2]);
    gl.uniform1f(uSeed,seed);
    function size(){
      var dpr=Math.min(window.devicePixelRatio||1,2);
      var w=cv.clientWidth||card.clientWidth||640, h=cv.clientHeight||card.clientHeight||360;
      cv.width=Math.max(1,Math.round(w*dpr)); cv.height=Math.max(1,Math.round(h*dpr));
      gl.viewport(0,0,cv.width,cv.height);
    }
    function draw(now){
      gl.uniform2f(uRes,cv.width,cv.height);
      gl.uniform1f(uT,(now/1000)+seed*4.0);
      gl.drawArrays(gl.TRIANGLES,0,6);
    }
    size();
    if(reduced){ draw(42000); return; }
    if(!('IntersectionObserver' in window)){ draw(42000); return; }
    var running=false, raf=0;
    function frame(now){ draw(now); raf=requestAnimationFrame(frame); }
    var io=new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        if(en.isIntersecting && !running){ running=true; raf=requestAnimationFrame(frame); }
        else if(!en.isIntersecting && running){ running=false; cancelAnimationFrame(raf); }
      });
    },{threshold:.02});
    io.observe(cv);
    window.addEventListener('resize',function(){ size(); if(!running) draw(performance.now()); });
  }
  cards.forEach(init);
})();
