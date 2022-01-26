import { htmlToElement } from "./dom-utils";

// Carousel
interface VideoList {
  readonly srcWebm: string;
  readonly srcMov?: string;
  readonly buttonImage: string;
  readonly buttonLabel: string;
}

interface CarouselOptions {
  stageEl: HTMLElement;
  buttonsEl: HTMLElement;
  data: VideoList[];
  activeIndex?: number;
  animDurationSec?: number;
}

export class Carousel implements CarouselOptions {
  get prevIndex() {
    return this.#prevIndex;
  }
  buttonsEl: CarouselOptions["buttonsEl"] = null;
  stageEl: CarouselOptions["stageEl"] = null;
  data: CarouselOptions["data"];

  get activeIndex() {
    return this.#activeIndex;
  }

  set activeIndex(value) {
    if (value === this.#activeIndex) return;
    this.#flyToOffscreen("left");
    this.#activeIndex = value;
    this.#flyToCenter("right");
    this.#selectActiveButton();
  }

  #activeIndex = 0;

  get animDurationSec() {
    return this.#animDurationSec;
  }

  set animDurationSec(value) {
    this.#animDurationSec = value;
    this.stageEl.style.setProperty(
      "--carousel-anim-duration",
      `${this.animDurationSec}s`
    );
  }

  #animDurationSec = 1.5;
  #prevIndex = 0;
  #lastElement: HTMLElement;
  #items: HTMLElement[];
  #allButtons: HTMLElement[] = [];

  constructor(options: CarouselOptions) {
    Object.assign(this, options);

    this.#items = this.data.map((videoData) => {
      return htmlToElement(`
      <div class="carousel-item">
        <video autoplay muted loop playsinline>
          <source src=${videoData.srcWebm} type="video/webm"></source>
        </video>
      </div>`);
    });

    this.stageEl.style.setProperty(
      "--carousel-anim-duration",
      `${this.animDurationSec}s`
    );

    const buttonsContainer = document.createElement("div");
    buttonsContainer.classList.add("carousel-buttons-container");

    this.data.forEach((videoData, index) => {
      const { buttonImage, buttonLabel } = videoData;
      const button = htmlToElement(
        `<button
          type="button"
          class="carousel-button"
          data-index="${index}"
          style="background-image: url(${buttonImage})"
        >
          <span class="visually-hidden">${buttonLabel}</span>
        </button>`
      );
      this.#allButtons.push(button);
      buttonsContainer.appendChild(button);
    });

    this.buttonsEl.appendChild(buttonsContainer);
    this.buttonsEl.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      const closestButton = target.closest(".carousel-button");
      if (closestButton) {
        const index = parseInt(target.dataset.index, 10);
        this.activeIndex = index;
      }
    });

    this.#flyToCenter("right");
    this.#selectActiveButton();
  }

  #selectActiveButton() {
    this.#allButtons.forEach((button) =>
      button.classList.remove("carousel-button--selected")
    );
    console.log(this.#allButtons);
    this.#allButtons[this.activeIndex].classList.add(
      "carousel-button--selected"
    );
  }

  #createActiveItem(): HTMLElement {
    const item = this.#items[this.activeIndex].cloneNode(true) as HTMLElement;
    this.stageEl.appendChild(item);
    this.#lastElement = item;
    return item;
  }

  #flyToOffscreen(dir: "left" | "right") {
    const currItem = this.#lastElement;
    currItem.classList.add("carousel-item--animate");
    currItem.classList.add(`carousel-item--offscreen-${dir}`);
    currItem.ontransitionend = () => {
      currItem.parentNode.removeChild(currItem);
    };
  }

  #flyToCenter(from: "left" | "right") {
    const newItem = this.#createActiveItem();
    const classNameFrom = `carousel-item--offscreen-${from}`;
    newItem.classList.add(classNameFrom);
    requestAnimationFrame(() => {
      newItem.classList.add("carousel-item--animate");
      newItem.classList.add("carousel-item--active");
      newItem.classList.remove(classNameFrom);
      newItem.ontransitionend = () => {
        newItem.classList.remove("carousel-item--animate");
        newItem.ontransitionend = null;
      };
    });
  }

  next() {
    this.#flyToOffscreen("left");

    this.activeIndex =
      this.activeIndex + 1 === this.#items.length ? 0 : this.activeIndex + 1;

    this.#flyToCenter("right");
  }

  prev() {
    this.#flyToOffscreen("right");

    this.activeIndex =
      this.activeIndex === 0 ? this.#items.length - 1 : this.activeIndex - 1;

    this.#flyToCenter("left");
  }
}
