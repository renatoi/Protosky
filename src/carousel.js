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
    const currPositioner = this.items[this.activeIndex].positioner;
    new TWEEN.Tween(currPositioner)
      .to(this.itemLeftPos, this.animDuration * 1000)
      .easing(TWEEN.Easing.Quadratic.In)
      .start();

    this.activeIndex =
      this.activeIndex + 1 === this.items.length ? 0 : this.activeIndex + 1;

    // new one
    this.items[this.activeIndex].positioner = {
      ...this.itemRightPos,
    };
    new TWEEN.Tween(this.items[this.activeIndex].positioner)
      .to(this.itemMiddlePos, this.animDuration * 1000)
      .easing(TWEEN.Easing.Quadratic.Out)
      .start();
  }

  prev() {
    const currPositioner = this.items[this.activeIndex].positioner;
    new TWEEN.Tween(currPositioner)
      .to(this.itemRightPos, this.animDuration * 1000)
      .easing(TWEEN.Easing.Quadratic.In)
      .start();

    this.activeIndex =
      this.activeIndex === 0 ? this.items.length - 1 : this.activeIndex - 1;

    // new one
    this.items[this.activeIndex].positioner = {
      ...this.itemLeftPos,
    };
    new TWEEN.Tween(this.items[this.activeIndex].positioner)
      .to(this.itemMiddlePos, this.animDuration * 1000)
      .easing(TWEEN.Easing.Quadratic.Out)
      .start();
  }
}
