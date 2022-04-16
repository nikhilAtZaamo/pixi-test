import { BulgePinchFilter } from "@pixi/filter-bulge-pinch";
import * as PIXI from "pixi.js";
import { fitCover, loadImages } from "./utility";
import gsap from "gsap";

interface ISketch {
  wrapper: HTMLElement;
  images: {
    id: string;
    slug: string;
    imageUrl: string;
  }[];
  numRows: number;
  numCols: number;
  app: PIXI.Application;
  container: PIXI.Container;
  loadedImages: HTMLImageElement[];
  width: number;
  height: number;
  margin: number;
  destroy: () => void;
  bulgeFilter: BulgePinchFilter;
  isDragging: boolean;
  isBulging: boolean;
  scroll: {
    deltaX: number;
    deltaY: number;
  };
  thumbs: PIXI.Container[];
  WHOLE_WIDTH: {
    x: number;
    y: number;
  };

  availableScrollSpace: {
    x: number;
    y: number;
  };

  onImageClick: (slug: string) => void;
  lastClickedSlug: string | null;
  pointerInitiateTimeStamp: number | null;
  pointerInitialPosition: {
    x: number | null;
    y: number | null;
  };
  pointerEndPosition: {
    x: number | null;
    y: number | null;
  };
}

export default class Sketch implements ISketch {
  wrapper: HTMLElement;
  images: {
    id: string;
    slug: string;
    imageUrl: string;
  }[];
  numRows: number;
  numCols: number;
  app: PIXI.Application;
  container: PIXI.Container;
  loadedImages: HTMLImageElement[] = [];
  width: number;
  height: number;
  margin: number;

  bulgeFilter: BulgePinchFilter = new BulgePinchFilter({
    strength: 0,
    radius:
      Math.sqrt(
        Math.pow(window.innerWidth, 2) + Math.pow(window.innerHeight, 2)
      ) / 2,
  });

  isDragging = false;
  isBulging = false;
  scroll: { deltaX: number; deltaY: number } = {
    deltaX: 0,
    deltaY: 0,
  };
  thumbs: PIXI.Container[] = [];

  WHOLE_WIDTH: { x: number; y: number };
  availableScrollSpace: { x: number; y: number };
  onImageClick: (slug: string) => void;
  lastClickedSlug: string | null = null;
  pointerInitiateTimeStamp: number | null = null;
  pointerInitialPosition: { x: number | null; y: number | null } = {
    x: null,
    y: null,
  };

  pointerEndPosition: { x: number | null; y: number | null } = {
    x: null,
    y: null,
  };

  constructor(
    wrapper: HTMLElement,
    imagePaths: {
      id: string;
      slug: string;
      imageUrl: string;
    }[],
    handleImageClick: (slug: string) => void,
    onLoad?: () => void
  ) {
    this.wrapper = wrapper;
    this.onImageClick = handleImageClick;

    this.app = new PIXI.Application({
      height: window.innerHeight,
      width: window.innerWidth,
      backgroundColor: 0x000000,
    });

    const dimenstion = this._getImageDimensions();

    this.margin = dimenstion.margin;
    this.width = dimenstion.width;
    this.height = dimenstion.height;

    this.container = new PIXI.Container();
    this.app.stage.addChild(this.container);

    this.images = imagePaths;

    // get numRow and numCol if images are arranged in a square
    this.numRows = Math.ceil(Math.sqrt(this.images.length));
    this.numCols = Math.ceil(this.images.length / this.numRows);

    this.WHOLE_WIDTH = {
      x: this.numCols * (this.width + this.margin),
      y: this.numRows * (this.height + this.margin),
    };

    this.availableScrollSpace = {
      x: this.WHOLE_WIDTH.x - this.app.renderer.width,
      y: this.WHOLE_WIDTH.y - this.app.renderer.height,
    };

    // center the container

    this.container.x = -this.availableScrollSpace.x / 2;
    this.container.y = -this.availableScrollSpace.y / 2;

    loadImages(this.images, (imgs) => {
      this.loadedImages = imgs;
      this._add();
      this._renderer();
      this._addBulgeFilter();
      document.addEventListener("touchstart", this._startDrag);
      document.addEventListener("touchend", this._endDrag);
      document.addEventListener("mousedown", this._startDrag);
      document.addEventListener("mouseup", this._endDrag);
      document.addEventListener("wheel", this._scroll);
      document.addEventListener("touchmove", this._drag);
      document.addEventListener("mousemove", this._drag);

      wrapper.appendChild(this.app.view);
      if (onLoad) onLoad();
    });

    return this;
  }

  _add() {
    let parent = {
      w: this.width,
      h: this.height,
    };
    this.loadedImages.forEach((img, i) => {
      const texture = PIXI.Texture.from(img);
      const sprite = new PIXI.Sprite(texture);
      const container = new PIXI.Container();
      const spriteContainer = new PIXI.Container();

      const mask = new PIXI.Sprite(PIXI.Texture.WHITE);

      mask.width = this.width;
      mask.height = this.height;
      sprite.mask = mask;

      sprite.anchor.set(0.5);

      sprite.position.set(
        sprite.texture.orig.width / 2,
        sprite.texture.orig.height / 2
      );

      const image = {
        w: sprite.texture.orig.width,
        h: sprite.texture.orig.height,
      };

      const cover = fitCover(image, parent);

      spriteContainer.position.set(cover.left, cover.top);
      spriteContainer.scale.set(cover.scale, cover.scale);

      container.x = (this.width + this.margin) * (i % this.numCols);
      container.y = (this.height + this.margin) * Math.floor(i / this.numCols);

      spriteContainer.addChild(sprite);
      container.addChild(spriteContainer);
      container.addChild(mask);

      this.container.addChild(container);
      this.thumbs.push(container);

      spriteContainer.interactive = true;
      spriteContainer.buttonMode = true;
      spriteContainer.on("pointerdown", () => {
        this.lastClickedSlug = this.images[i].slug;
      });
    });
  }
  _renderer() {
    this.app.ticker.add(() => {
      this.app.renderer.render(this.container);

      if (this.isBulging) {
        if (this.bulgeFilter.strength < 0.2) {
          this.bulgeFilter.strength += 0.025;
        }

        if (!this.wrapper.classList.contains("insetShadow"))
          this.wrapper.classList.add("insetShadow");
      } else {
        if (this.bulgeFilter.strength > 0) {
          this.bulgeFilter.strength -= 0.025;
        }

        if (this.wrapper.classList.contains("insetShadow")) {
          this.wrapper.classList.remove("insetShadow");
        }
      }

      if (this.scroll.deltaX !== 0 || this.scroll.deltaY !== 0) {
        if (
          this.scroll.deltaX < 20 &&
          this.scroll.deltaX > -20 &&
          this.scroll.deltaY < 20 &&
          this.scroll.deltaY > -20
        ) {
          if (this.isBulging) {
            this.isBulging = false;
          }
        }

        if (
          this.scroll.deltaX < 1 &&
          this.scroll.deltaX > -1 &&
          this.scroll.deltaY < 1 &&
          this.scroll.deltaY > -1
        ) {
          this.scroll.deltaX = 0;
          this.scroll.deltaY = 0;
          return;
        }

        if (!this.isBulging) {
          this.isBulging = true;
        }
        this.scroll.deltaX *= 0.9;
        this.scroll.deltaY *= 0.9;

        // this.thumbs.forEach((thumb) => {
        //   thumb.position.x -= this.scroll.deltaX;
        //   thumb.position.y -= this.scroll.deltaY;
        // });

        for (let i = 0; i < this.thumbs.length; i++) {
          const { x, y } = this._calcPos(this.scroll, this.thumbs[i].position);
          this.thumbs[i].position.set(x, y);
        }

        // this.container.position.x -= this.scroll.deltaX;
        // this.container.position.y -= this.scroll.deltaY;

        // detecting boundry
        // this._detectBoundry();
      }
    });
  }

  _addBulgeFilter() {
    this.app.stage.filters = [this.bulgeFilter];
  }

  _detectBoundry() {
    if (this.availableScrollSpace.x < 0) {
      if (this.container.position.x > -this.availableScrollSpace.x) {
        if (this.isDragging) this.isDragging = false;
        this.scroll.deltaX = 0.1 * this.container.position.x;
      }
      if (this.container.position.x < -50) {
        if (this.isDragging) this.isDragging = false;
        this.scroll.deltaX = this.availableScrollSpace.x / 80;
      }
    } else {
      if (this.container.position.x + this.availableScrollSpace.x + 50 < 0) {
        if (this.isDragging) this.isDragging = false;
        this.scroll.deltaX = this.container.position.x / 220;
      }
      if (this.container.position.x > 50) {
        if (this.isDragging) this.isDragging = false;
        this.scroll.deltaX = this.container.position.x / 20;
      }
    }

    if (this.availableScrollSpace.y < 0) {
      if (this.container.position.y > -this.availableScrollSpace.y) {
        if (this.isDragging) this.isDragging = false;
        this.scroll.deltaY = 0.1 * this.container.position.y;
      }
      if (this.container.position.y < -50) {
        if (this.isDragging) this.isDragging = false;
        this.scroll.deltaY = this.availableScrollSpace.y / 80;
      }
    } else {
      if (this.container.position.y + this.availableScrollSpace.y + 50 < 0) {
        if (this.isDragging) this.isDragging = false;
        this.scroll.deltaY = this.container.position.y / 220;
      }
      if (this.container.position.y > 50) {
        if (this.isDragging) this.isDragging = false;
        this.scroll.deltaY = this.container.position.y / 20;
      }
    }
  }
  _startDrag = (e: TouchEvent | MouseEvent) => {
    this.isDragging = true;

    if (e instanceof MouseEvent) {
      this.pointerInitialPosition = {
        x: e.clientX,
        y: e.clientY,
      };
    } else {
      this.pointerInitialPosition = {
        x: e.targetTouches[0]?.clientX,
        y: e.targetTouches[0]?.clientY,
      };
    }

    this.pointerInitiateTimeStamp = e.timeStamp;
  };

  _endDrag = (e: TouchEvent | MouseEvent) => {
    this.isDragging = false;
    if (
      !this.pointerInitiateTimeStamp ||
      !this.pointerInitialPosition.x ||
      !this.pointerInitialPosition.y
    )
      return;

    let pointerFinalPosition: { x: number; y: number };

    if (e instanceof MouseEvent) {
      pointerFinalPosition = {
        x: e.clientX,
        y: e.clientY,
      };
    } else {
      pointerFinalPosition = {
        x: e.changedTouches[0]?.clientX,
        y: e.changedTouches[0]?.clientY,
      };
    }

    const isClick =
      e.timeStamp - this.pointerInitiateTimeStamp < 200 &&
      Math.abs(this.pointerInitialPosition.x - pointerFinalPosition.x) <= 1 &&
      Math.abs(this.pointerInitialPosition.y - pointerFinalPosition.y) <= 1;
    const imageSlug = this.lastClickedSlug;
    this.lastClickedSlug = null;

    if (isClick && imageSlug) {
      this.onImageClick(imageSlug);
    }
  };

  _scroll = (e: WheelEvent) => {
    this.isDragging = false;
    this.scroll.deltaX = e.deltaX / 7;
    this.scroll.deltaY = e.deltaY / 7;
  };

  _drag = (e: TouchEvent | MouseEvent) => {
    if (e instanceof MouseEvent) {
      this.pointerEndPosition = {
        x: e.clientX,
        y: e.clientY,
      };
    } else {
      if (e.targetTouches.length === 1) {
        this.pointerEndPosition = {
          x: e.targetTouches[0]?.clientX,
          y: e.targetTouches[0]?.clientY,
        };
      }
    }
    if (!this.isDragging) return;

    if (!this.pointerEndPosition.x || !this.pointerEndPosition.y) return;
    if (!this.pointerInitialPosition.x || !this.pointerInitialPosition.y)
      return;

    const deltaX = this.pointerEndPosition.x - this.pointerInitialPosition.x;
    const deltaY = this.pointerEndPosition.y - this.pointerInitialPosition.y;

    this.scroll.deltaX = -deltaX / 7;
    this.scroll.deltaY = -deltaY / 7;
  };

  _calcPos(
    scroll: {
      deltaX: number;
      deltaY: number;
    },
    pos: {
      x: number;
      y: number;
    }
  ) {
    let newPosX =
      ((pos.x - scroll.deltaX + this.WHOLE_WIDTH.x + this.width + this.margin) %
        this.WHOLE_WIDTH.x) -
      this.width -
      this.margin;

    let newPosY =
      ((pos.y -
        scroll.deltaY +
        this.WHOLE_WIDTH.y +
        this.height +
        this.margin) %
        this.WHOLE_WIDTH.y) -
      this.height -
      this.margin;

    return {
      x: newPosX,
      y: newPosY,
    };
  }

  _getImageDimensions() {
    const width = window.innerWidth;

    if (width <= 600) {
      return {
        margin: 40,
        width: window.innerWidth / 1.2 - 2 * 40,
        height: (window.innerWidth / 1.2) * 1.3 - 2 * 40,
      };
    }

    if (width <= 700) {
      return {
        margin: 40,
        width: window.innerWidth / 1.2 - 2 * 40,
        height: (window.innerWidth / 1.2) * 1.2 - 2 * 40,
      };
    }
    if (width <= 850) {
      return {
        margin: 50,
        width: window.innerWidth / 1.6 - 2 * 40,
        height: (window.innerWidth / 1.6) * 1.2 - 2 * 40,
      };
    }

    return {
      margin: 60,
      width: window.innerWidth / 3.4 - 2 * 60,
      height: (window.innerWidth / 3.4) * 1.05 - 2 * 60,
    };
  }

  _imageMouseOver(e: any) {
    if (this.isBulging || this.isDragging) return;

    let el = e.currentTarget.children[0].children[0];
    gsap.to(el.scale, {
      duration: 0.5,
      x: 1.1,
      y: 1.1,
    });
  }
  _imageMouseOut(e: any) {
    if (this.isBulging || this.isDragging) return;
    let el = e.currentTarget.children[0].children[0];
    gsap.to(el.scale, {
      duration: 0.5,
      x: 1,
      y: 1,
    });
  }

  destroy() {
    document.removeEventListener("touchstart", this._startDrag);
    document.removeEventListener("touchend", this._endDrag);
    document.removeEventListener("mousedown", this._startDrag);
    document.removeEventListener("mouseup", this._endDrag);
    document.removeEventListener("wheel", this._scroll);
    document.removeEventListener("mousemove", this._drag);
    document.removeEventListener("touchmove", this._drag);
    this.app.destroy(true);
  }
}
