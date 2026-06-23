export class InputHandler {
  constructor() {
    this.keys = {};
    
    // Virtual controls state for mobile/touch
    this.mobileInputs = {
      1: {
        left: false,
        right: false,
        jump: false,
        crouch: false,
        block: false,
        punch: false,
        kick: false,
        sweep: false,
        special: false,
        pickup: false
      },
      2: {
        left: false,
        right: false,
        jump: false,
        crouch: false,
        block: false,
        punch: false,
        kick: false,
        sweep: false,
        special: false,
        pickup: false
      }
    };

    // Keyboard layouts
    this.p1Keys = {
      up: 'KeyW',
      left: 'KeyA',
      down: 'KeyS',
      right: 'KeyD',
      punch: 'KeyJ',
      kick: 'KeyK',
      sweep: 'KeyL',
      special: 'KeyI',
      pickup: 'KeyU'
    };

    this.p2Keys = {
      up: 'ArrowUp',
      left: 'ArrowLeft',
      down: 'ArrowDown',
      right: 'ArrowRight',
      punch: ['Numpad1', 'Digit1'],
      kick: ['Numpad2', 'Digit2'],
      sweep: ['Numpad3', 'Digit3'],
      special: ['Numpad5', 'Digit5'],
      pickup: ['Numpad4', 'Digit4']
    };

    this.initKeyboardListeners();
  }

  initKeyboardListeners() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });
  }

  // Set virtual mobile inputs
  setMobileInput(playerId, action, isActive) {
    if (this.mobileInputs[playerId] && action in this.mobileInputs[playerId]) {
      this.mobileInputs[playerId][action] = isActive;
    }
  }

  // Clear all pressed keys and inputs
  reset() {
    this.keys = {};
    for (let p in this.mobileInputs) {
      for (let act in this.mobileInputs[p]) {
        this.mobileInputs[p][act] = false;
      }
    }
  }

  isKeyMatched(keyCodeOrArray) {
    if (Array.isArray(keyCodeOrArray)) {
      return keyCodeOrArray.some(code => this.keys[code]);
    }
    return this.keys[keyCodeOrArray];
  }

  getP1Inputs() {
    return {
      left: this.isKeyMatched(this.p1Keys.left) || this.mobileInputs[1].left,
      right: this.isKeyMatched(this.p1Keys.right) || this.mobileInputs[1].right,
      jump: this.isKeyMatched(this.p1Keys.up) || this.mobileInputs[1].jump,
      crouch: this.isKeyMatched(this.p1Keys.down) || this.mobileInputs[1].crouch,
      block: this.isKeyMatched(this.p1Keys.down) || this.mobileInputs[1].block, // block is crouch/back
      punch: this.isKeyMatched(this.p1Keys.punch) || this.mobileInputs[1].punch,
      kick: this.isKeyMatched(this.p1Keys.kick) || this.mobileInputs[1].kick,
      sweep: this.isKeyMatched(this.p1Keys.sweep) || this.mobileInputs[1].sweep,
      special: this.isKeyMatched(this.p1Keys.special) || this.mobileInputs[1].special,
      pickup: this.isKeyMatched(this.p1Keys.pickup) || this.mobileInputs[1].pickup
    };
  }

  getP2Inputs() {
    return {
      left: this.isKeyMatched(this.p2Keys.left) || this.mobileInputs[2].left,
      right: this.isKeyMatched(this.p2Keys.right) || this.mobileInputs[2].right,
      jump: this.isKeyMatched(this.p2Keys.up) || this.mobileInputs[2].jump,
      crouch: this.isKeyMatched(this.p2Keys.down) || this.mobileInputs[2].crouch,
      block: this.isKeyMatched(this.p2Keys.down) || this.mobileInputs[2].block,
      punch: this.isKeyMatched(this.p2Keys.punch) || this.mobileInputs[2].punch,
      kick: this.isKeyMatched(this.p2Keys.kick) || this.mobileInputs[2].kick,
      sweep: this.isKeyMatched(this.p2Keys.sweep) || this.mobileInputs[2].sweep,
      special: this.isKeyMatched(this.p2Keys.special) || this.mobileInputs[2].special,
      pickup: this.isKeyMatched(this.p2Keys.pickup) || this.mobileInputs[2].pickup
    };
  }
}
