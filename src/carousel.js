import TWEEN from "@tweenjs/tween.js";

// Carousel
export class Carousel {
  prevIndex = 0;
  activeIndex = 0;
  animDuration = 3;
  items = [];

  itemRightPos = { x: 20, y: 10 };
  itemMiddlePos = { x: 0, y: 0 };
  itemLeftPos = { x: -20, y: 10 };

  isInitialized = false;

  constructor(options = {}) {
    this.configure(options);
  }

  configure(options = {}) {
    Object.assign(this, options);
  }

  init() {
    if (this.isInitialized) return;

    this.items[this.activeIndex].positioner = {
      ...this.itemRightPos,
    };
    new TWEEN.Tween(this.items[this.activeIndex].positioner)
      .to(this.itemMiddlePos, this.animDuration * 1000)
      .easing(TWEEN.Easing.Quadratic.Out)
      .start();

    this.isInitialized = true;
  }

  update(time, cb) {
    cb();
    TWEEN.update(time);
  }

  next() {
    const currItem = this.items[this.activeIndex];
    new TWEEN.Tween(currItem.positioner)
      .to(this.itemLeftPos, this.animDuration * 1000)
      .easing(TWEEN.Easing.Quadratic.In)
      .onComplete(() => {
        currItem.root.visible = false;
      })
      .start();

    this.activeIndex =
      this.activeIndex + 1 === this.items.length ? 0 : this.activeIndex + 1;

    // new one
    const newItem = this.items[this.activeIndex];
    newItem.positioner = {
      ...this.itemRightPos,
    };
    newItem.root.visible = true;
    new TWEEN.Tween(newItem.positioner)
      .to(this.itemMiddlePos, this.animDuration * 1000)
      .easing(TWEEN.Easing.Quadratic.Out)
      .start();
  }

  prev() {
    const currItem = this.items[this.activeIndex];
    new TWEEN.Tween(currItem.positioner)
      .to(this.itemRightPos, this.animDuration * 1000)
      .easing(TWEEN.Easing.Quadratic.In)
      .onComplete(() => {
        currItem.root.visible = false;
      })
      .start();

    this.activeIndex =
      this.activeIndex === 0 ? this.items.length - 1 : this.activeIndex - 1;

    // new one
    const newItem = this.items[this.activeIndex];
    newItem.positioner = {
      ...this.itemLeftPos,
    };
    newItem.root.visible = true;
    new TWEEN.Tween(this.items[this.activeIndex].positioner)
      .to(this.itemMiddlePos, this.animDuration * 1000)
      .easing(TWEEN.Easing.Quadratic.Out)
      .start();
  }
}
