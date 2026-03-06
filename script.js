(function () {
  function setupReveals() {
    var revealItems = document.querySelectorAll('.panel > *, .spec-card, .cta-row, .price, .price-label');
    if (!revealItems.length) {
      return;
    }

    document.body.classList.add('js-ready');
    revealItems.forEach(function (el) {
      el.classList.add('reveal');
    });

    if (!('IntersectionObserver' in window)) {
      revealItems.forEach(function (el) {
        el.classList.add('is-in');
      });
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in');
          }
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -10% 0px' }
    );

    revealItems.forEach(function (el) {
      observer.observe(el);
    });

    requestAnimationFrame(function () {
      var firstFold = document.querySelectorAll('#hero > *');
      firstFold.forEach(function (el) {
        el.classList.add('is-in');
      });
    });
  }

  setupReveals();

  function setupSmoothAnchorNavigation() {
    var links = document.querySelectorAll('a[href^="#"]');
    if (!links.length) {
      return;
    }

    var topbar = document.querySelector('.topbar');
    var rafId = 0;

    function easeInOutCubic(t) {
      return t < 0.5
        ? 4 * t * t * t
        : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    function getTopOffset() {
      if (!topbar) {
        return 16;
      }
      return topbar.getBoundingClientRect().height + 18;
    }

    links.forEach(function (link) {
      link.addEventListener('click', function (event) {
        var href = link.getAttribute('href');
        if (!href) {
          return;
        }

        if (href === '#') {
          event.preventDefault();
          return;
        }

        var target = document.querySelector(href);
        if (!target) {
          return;
        }

        event.preventDefault();
        if (rafId) {
          cancelAnimationFrame(rafId);
        }

        var startY = window.scrollY || window.pageYOffset || 0;
        var targetY = target.getBoundingClientRect().top + startY - getTopOffset();
        targetY = Math.max(0, targetY);
        var distance = targetY - startY;
        if (Math.abs(distance) < 2) {
          return;
        }

        var mobileNav = window.innerWidth <= 768;
        var durationScale = mobileNav ? 0.52 : 0.7;
        var durationMin = mobileNav ? 520 : 720;
        var durationMax = mobileNav ? 1100 : 1400;
        var duration = Math.max(durationMin, Math.min(durationMax, Math.abs(distance) * durationScale));
        var startTime = performance.now();

        function step(now) {
          var progress = Math.min(1, (now - startTime) / duration);
          var eased = easeInOutCubic(progress);
          window.scrollTo(0, startY + distance * eased);

          if (progress < 1) {
            rafId = requestAnimationFrame(step);
            return;
          }

          rafId = 0;
          if (window.history && window.history.replaceState) {
            window.history.replaceState(null, '', href);
          }
        }

        rafId = requestAnimationFrame(step);
      });
    });
  }

  setupSmoothAnchorNavigation();

  function setupSegmentVideoLoops() {
    var videos = document.querySelectorAll('video[data-loop-start][data-loop-end]');
    if (!videos.length) {
      return;
    }

    videos.forEach(function (video) {
      var start = parseFloat(video.dataset.loopStart || '0');
      var end = parseFloat(video.dataset.loopEnd || '0');
      if (!(end > start)) {
        return;
      }

      var isInView = false;
      var isReady = false;
      var seeking = false;

      video.muted = true;
      video.defaultMuted = true;
      video.playsInline = true;
      video.autoplay = true;
      video.loop = false;
      video.preload = 'auto';
      video.setAttribute('muted', '');
      video.setAttribute('playsinline', '');
      video.setAttribute('autoplay', '');
      video.pause();

      function resetToStart() {
        try {
          video.currentTime = start + 0.01;
        } catch (_err) {}
      }

      function playIfAllowed() {
        if (!isInView || document.hidden) {
          return;
        }
        if (!isReady && video.readyState < 1) {
          video.load();
          return;
        }

        if (video.currentTime < start - 0.03 || video.currentTime > end + 0.03) {
          resetToStart();
        }

        var playPromise = video.play();
        if (playPromise && typeof playPromise.catch === 'function') {
          playPromise.catch(function () {});
        }
      }

      function pauseVideo() {
        if (!video.paused) {
          video.pause();
        }
      }

      video.addEventListener('loadedmetadata', function () {
        isReady = true;
        resetToStart();
        if (isInView) {
          playIfAllowed();
        } else {
          pauseVideo();
        }
      });

      video.addEventListener('canplay', function () {
        isReady = true;
        if (isInView) {
          playIfAllowed();
        }
      });
      video.addEventListener('loadeddata', function () {
        isReady = true;
        if (isInView) {
          playIfAllowed();
        }
      });

      video.addEventListener('timeupdate', function () {
        if (!isInView) {
          return;
        }

        if (video.currentTime < start - 0.03) {
          resetToStart();
          return;
        }

        if (video.currentTime >= end && !seeking) {
          seeking = true;
          resetToStart();
          if (video.paused) {
            playIfAllowed();
          }
          setTimeout(function () {
            seeking = false;
          }, 0);
        }
      });

      var section = video.closest('.panel-video') || video.closest('section') || video.parentElement || video;
      if ('IntersectionObserver' in window) {
        var io = new IntersectionObserver(
          function (entries) {
            entries.forEach(function (entry) {
              if (entry.target !== section) {
                return;
              }
              isInView = entry.isIntersecting && entry.intersectionRatio >= 0.12;
              if (isInView) {
                playIfAllowed();
              } else {
                pauseVideo();
              }
            });
          },
          { threshold: [0, 0.05, 0.12, 0.2, 0.45] }
        );
        io.observe(section);
      } else {
        isInView = true;
        playIfAllowed();
      }

      document.addEventListener('visibilitychange', function () {
        if (document.hidden) {
          pauseVideo();
        } else if (isInView) {
          playIfAllowed();
        }
      });

      ['pointerdown', 'touchstart', 'wheel', 'scroll'].forEach(function (eventName) {
        window.addEventListener(eventName, playIfAllowed, { passive: true });
      });

      window.setInterval(function () {
        if (isInView && !document.hidden && video.paused) {
          playIfAllowed();
        }
      }, 700);

      video.load();
      setTimeout(playIfAllowed, 120);
      setTimeout(playIfAllowed, 700);
    });
  }

  setupSegmentVideoLoops();

  function setupHeroBackgroundPhoto() {
    var photo = document.getElementById('hero-bg-photo');
    var vignette = document.querySelector('.scene-wrap .vignette');
    if (!photo) {
      return null;
    }

    return function updatePhoto(scroll, pointerX, pointerY, heroMix) {
      var tx = pointerX * -6;
      var ty = pointerY * -4 - scroll * 4;
      var scale = 1.015 + scroll * 0.012;
      photo.style.transform =
        'translate3d(' +
        tx.toFixed(2) +
        'px,' +
        ty.toFixed(2) +
        'px,0) scale(' +
        scale.toFixed(3) +
        ')';
      photo.style.opacity = (0.94 * heroMix).toFixed(3);
      if (vignette) {
        vignette.style.opacity = (0.16 + heroMix * 0.44).toFixed(3);
      }
    };
  }

  var updateHeroBackgroundPhoto = setupHeroBackgroundPhoto();

  if (!window.THREE) {
    console.error('Three.js no esta disponible.');
    return;
  }

  var THREE = window.THREE;
  var canvas = document.getElementById('scene');
  var sequenceRoot = document.getElementById('shoe-sequence');
  var heroSection = document.getElementById('hero');
  if (!canvas) {
    return;
  }

  function clamp01(value) {
    return Math.max(0, Math.min(1, value));
  }

  function smoothstep(edge0, edge1, x) {
    var t = clamp01((x - edge0) / Math.max(edge1 - edge0, 0.0001));
    return t * t * (3 - 2 * t);
  }

  function getHeroProgress() {
    if (!heroSection) {
      return 0;
    }
    var firstSectionHeight = Math.max(heroSection.offsetHeight || 0, window.innerHeight || 1, 1);
    return window.scrollY / firstSectionHeight;
  }

  var angleSources = [
    './assets/solid/1.png',
    './assets/solid/2.png',
    './assets/solid/3.png',
    './assets/solid/4.png',
    './assets/solid/5.png',
    './assets/solid/6.png'
  ];

  var sequenceImages = [];
  if (sequenceRoot) {
    sequenceRoot.innerHTML = '';
    angleSources.forEach(function (src, index) {
      var img = document.createElement('img');
      img.className = 'shoe-angle' + (index === 0 ? ' is-active' : '');
      img.src = src;
      img.alt = '';
      img.loading = index < 2 ? 'eager' : 'lazy';
      img.decoding = 'async';
      sequenceRoot.appendChild(img);
      sequenceImages.push(img);
    });
  }

  var scene = new THREE.Scene();
  var bgColor = new THREE.Color('#1d1d1d');
  scene.background = bgColor;
  scene.fog = new THREE.Fog('#a6a6a6', 5, 50);

  var isMobileViewport = window.innerWidth <= 768;
  var isPhoneViewport = window.innerWidth <= 540;
  function refreshViewportFlags() {
    isMobileViewport = window.innerWidth <= 768;
    isPhoneViewport = window.innerWidth <= 540;
  }
  refreshViewportFlags();

  var camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 1.4, 8);

  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false });
  function getRenderPixelRatio() {
    var cap = isPhoneViewport ? 1.15 : isMobileViewport ? 1.35 : 2;
    return Math.min(window.devicePixelRatio || 1, cap);
  }
  renderer.setPixelRatio(getRenderPixelRatio());
  renderer.setSize(window.innerWidth, window.innerHeight);

  if ('outputColorSpace' in renderer && THREE.SRGBColorSpace) {
    renderer.outputColorSpace = THREE.SRGBColorSpace;
  } else if ('outputEncoding' in renderer && THREE.sRGBEncoding) {
    renderer.outputEncoding = THREE.sRGBEncoding;
  }

  var hemi = new THREE.HemisphereLight(0xffffff, 0x1f1f1f, 0.85);
  scene.add(hemi);

  var key = new THREE.DirectionalLight(0xffffff, 1.1);
  key.position.set(4, 7, 4);
  scene.add(key);

  var rim = new THREE.DirectionalLight(0x9d9d9d, 0.65);
  rim.position.set(-4, 2, -4);
  scene.add(rim);

  var floorMaterial = new THREE.MeshStandardMaterial({
    color: '#202020',
    roughness: 1,
    metalness: 0,
    transparent: true,
    opacity: 0
  });

  var floor = new THREE.Mesh(new THREE.CircleGeometry(14, 96), floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1.22;
  floor.visible = false;
  scene.add(floor);

  var particles = new THREE.Group();
  var rockTextureLoader = new THREE.TextureLoader();
  var rockTextureSources = [
    './assets/rocks/rock-1.png',
    './assets/rocks/rock-2.png',
    './assets/rocks/rock-3.png',
    './assets/rocks/rock-4.png'
  ];
  var maxAnisotropy = renderer.capabilities && renderer.capabilities.getMaxAnisotropy
    ? Math.min(8, renderer.capabilities.getMaxAnisotropy())
    : 1;

  var rockCount = isMobileViewport ? 10 : 16;
  for (var i = 0; i < rockCount; i += 1) {
    var rock = new THREE.Sprite(
      new THREE.SpriteMaterial({
        transparent: true,
        opacity: 0,
        alphaTest: 0.04,
        depthWrite: false,
        depthTest: true
      })
    );
    var baseScale = (isMobileViewport ? 0.22 : 0.28) + Math.random() * (isMobileViewport ? 0.16 : 0.22);
    rock.userData.baseScale = baseScale;
    var a = (i / rockCount) * Math.PI * 2;
    var r = (isMobileViewport ? 2 : 2.3) + Math.random() * (isMobileViewport ? 0.9 : 1.2);
    var y = -0.98 + Math.random() * 0.45;
    rock.position.set(Math.cos(a) * r, y, Math.sin(a) * r - 0.6);
    rock.scale.set(baseScale * 0.8, baseScale, 1);
    rock.userData.baseY = y;
    rock.userData.floatPhase = Math.random() * Math.PI * 2;
    rock.userData.floatSpeed = 0.75 + Math.random() * 0.65;
    rock.userData.floatAmp = (isMobileViewport ? 0.01 : 0.015) + Math.random() * (isMobileViewport ? 0.028 : 0.045);
    rock.userData.spin = (Math.random() - 0.5) * (isMobileViewport ? 0.006 : 0.012);

    var rockTexturePath = rockTextureSources[i % rockTextureSources.length];
    rockTextureLoader.load(
      rockTexturePath,
      (function (targetRock, targetMaterial) {
        return function (texture) {
          if ('colorSpace' in texture && THREE.SRGBColorSpace) {
            texture.colorSpace = THREE.SRGBColorSpace;
          } else if ('encoding' in texture && THREE.sRGBEncoding) {
            texture.encoding = THREE.sRGBEncoding;
          }
          texture.anisotropy = maxAnisotropy;
          texture.needsUpdate = true;
          targetMaterial.map = texture;
          targetMaterial.needsUpdate = true;

          if (texture.image && texture.image.width && texture.image.height) {
            var aspect = texture.image.width / texture.image.height;
            var h = targetRock.userData.baseScale;
            targetRock.scale.set(h * aspect, h, 1);
          }
        };
      })(rock, rock.material)
    );
    particles.add(rock);
  }
  scene.add(particles);

  var pointer = { x: 0, y: 0 };
  window.addEventListener('pointermove', function (event) {
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
  });

  function cameraByDevice() {
    refreshViewportFlags();
    camera.fov = isMobileViewport ? 62 : 30;
    camera.position.set(0, isMobileViewport ? 1.34 : 1.4, 8);
    camera.updateProjectionMatrix();
  }

  function onResize() {
    refreshViewportFlags();
    camera.aspect = window.innerWidth / window.innerHeight;
    cameraByDevice();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(getRenderPixelRatio());
  }

  window.addEventListener('resize', onResize);
  cameraByDevice();

  var palettes = ['#1d1d1d', '#252019', '#1f2320', '#141414'].map(function (hex) {
    return new THREE.Color(hex);
  });

  var clock = new THREE.Clock();
  function updateSequenceVisual(scroll, t, pointerX, pointerY) {
    if (!sequenceRoot || !sequenceImages.length) {
      return;
    }

    var maxIndex = sequenceImages.length - 1;
    var clampedScroll = Math.max(0, Math.min(1, scroll));
    var exactIndex = clampedScroll * maxIndex;
    var baseIndex = Math.floor(exactIndex);
    var localProgress = exactIndex - baseIndex;
    var holdRatio = 0.72;
    var transitionRatio = 1 - holdRatio;

    var opacities = new Array(sequenceImages.length).fill(0);
    if (baseIndex >= maxIndex) {
      opacities[maxIndex] = 1;
    } else if (localProgress <= holdRatio) {
      opacities[baseIndex] = 1;
    } else {
      var tBlend = (localProgress - holdRatio) / transitionRatio;
      tBlend = Math.max(0, Math.min(1, tBlend));
      var eased = tBlend * tBlend * (3 - 2 * tBlend);
      opacities[baseIndex] = 1 - eased;
      opacities[baseIndex + 1] = eased;
    }

    sequenceImages.forEach(function (img, index) {
      var alpha = opacities[index];
      img.style.opacity = alpha.toFixed(3);
      if (alpha > 0.35) {
        img.classList.add('is-active');
      } else {
        img.classList.remove('is-active');
      }
    });

    var isPhonePortrait = isPhoneViewport && window.innerHeight > window.innerWidth;
    var tx = isPhoneViewport
      ? (isPhonePortrait
        ? -14 + pointerX * 6 + Math.sin(scroll * Math.PI * 2) * 4
        : -6 + pointerX * 10 + Math.sin(scroll * Math.PI * 2) * 8)
      : pointerX * 34 + Math.sin(scroll * Math.PI * 2) * 26;
    var baseLift = isPhonePortrait ? -138 : isPhoneViewport ? -104 : window.innerWidth <= 992 ? -82 : -118;
    var ty = baseLift + pointerY * (isPhonePortrait ? 5 : isPhoneViewport ? 7 : 14) - scroll * (isPhonePortrait ? 7 : isPhoneViewport ? 10 : 16) + Math.sin(t * 1.4) * (isPhonePortrait ? 2 : isPhoneViewport ? 3 : 5);
    var rot = isPhonePortrait
      ? -0.5 + scroll * 2.4 + pointerX * 0.8
      : isPhoneViewport
        ? -1.2 + scroll * 4 + pointerX * 1.2
        : -2.5 + scroll * 7 + pointerX * 2.5;
    var scale = isPhonePortrait
      ? 0.84 + scroll * 0.03
      : (isPhoneViewport ? 0.9 : 1) + scroll * (isPhoneViewport ? 0.045 : 0.07);
    sequenceRoot.style.transform =
      'translate3d(' +
      tx.toFixed(2) +
      'px,' +
      ty.toFixed(2) +
      'px,0) rotate(' +
      rot.toFixed(2) +
      'deg) scale(' +
      scale.toFixed(3) +
      ')';
    sequenceRoot.style.opacity = '1';
  }

  function animate() {
    var t = clock.getElapsedTime();
    var scroll = window.scrollY / Math.max(document.body.scrollHeight - window.innerHeight, 1);
    var heroProgress = getHeroProgress();
    var rocksReveal = smoothstep(0.66, 1.08, heroProgress);
    var heroPhotoMix = 1 - rocksReveal;

    var p = scroll * (palettes.length - 1);
    var i = Math.floor(p);
    var f = p - i;
    var cA = palettes[Math.max(0, Math.min(palettes.length - 1, i))];
    var cB = palettes[Math.max(0, Math.min(palettes.length - 1, i + 1))];
    bgColor.copy(cA).lerp(cB, f);
    scene.background = bgColor;
    scene.fog.color.copy(bgColor);

    particles.visible = rocksReveal > 0.004;
    particles.rotation.y = t * (isMobileViewport ? 0.045 : 0.08) + scroll * (isMobileViewport ? 0.34 : 0.55);
    particles.children.forEach(function (rock) {
      if (rock.material) {
        rock.material.opacity = rocksReveal * (isMobileViewport ? 0.76 : 1);
        rock.material.rotation += rock.userData.spin;
      }
      rock.position.y =
        rock.userData.baseY +
        Math.sin(t * rock.userData.floatSpeed + rock.userData.floatPhase) * rock.userData.floatAmp;
    });

    camera.position.x = pointer.x * 0.08;
    camera.position.y = 1.4 + pointer.y * 0.06;
    camera.lookAt(0, 0.15, 0);
    if (updateHeroBackgroundPhoto) {
      updateHeroBackgroundPhoto(scroll, pointer.x, pointer.y, heroPhotoMix);
    }
    updateSequenceVisual(scroll, t, pointer.x, pointer.y);

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }

  animate();
})();
