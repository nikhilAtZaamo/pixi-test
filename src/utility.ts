// function to load all images in the page
export const loadImages = (
  imageData: {
    id: string;
    slug: string;
    imageUrl: string;
    name: string;
  }[],
  callback: (imgs: HTMLImageElement[]) => void
) => {
  const imgs: HTMLImageElement[] = [];
  imageData.forEach((path) => {
    const img = new Image();
    img.dataset.id = path.id;
    img.dataset.slug = path.slug;
    img.dataset.name = path.name;
    img.onload = () => {
      imgs.push(img);
      if (imgs.length === imageData.length) {
        callback(imgs);
      }
    };
    img.onerror = () => {
      img.src = "/images/dummyLogo.png";
    };
    // create sameOriginURL to avoid CORS
    fetch(path.imageUrl)
      .then((data) => {
        if (data.status >= 400) {
          throw new Error("Bad response from server");
        }
        return data.blob();
      })
      .then((blob) => {
        const reader = new window.FileReader();
        reader.onload = () => {
          img.src = reader.result as string;
        };

        reader.readAsDataURL(blob);
      })
      .catch(() => {
        img.src = "/images/dummyLogo.png";
      });
  });
};

// a function to calculate the position and scale parameters of image in container
// same as css object-fit cover
interface IObjectFitCover {
  w: number;
  h: number;
}
export function fitCover(target: IObjectFitCover, container: IObjectFitCover) {
  return calculate(target, container, true);
}

function calculate(
  target: IObjectFitCover,
  container: IObjectFitCover,
  cover: boolean
) {
  var containerW = container.w;
  var containerH = container.h;
  var targetW = target.w;
  var targetH = target.h;

  var rw = containerW / targetW;
  var rh = containerH / targetH;
  var r;

  if (cover) {
    r = rw > rh ? rw : rh;
  } else {
    r = rw < rh ? rw : rh;
  }

  return {
    left: (containerW - targetW * r) >> 1,
    top: (containerH - targetH * r) >> 1,
    width: targetW * r,
    height: targetH * r,
    scale: r,
  };
}

// function to transform the data received from the graphql query
export const transformData = (data: any) => {
  if (!data) return;
  try {
    const result: {
      id: string;
      slug: string;
      imageUrl: string;
    }[] = [];

    const edges: any[] = data.allCollections.edges;

    // using for loops for faster performance
    const len = edges.length;

    for (let i = 0; i < len; i++) {
      const node = edges[i].node;

      const { id, imageUrl, slug } = node;

      const finalImageUrl = imageUrl.length
        ? imageUrl
        : "/images/dummyLogo.png";

      result.push({
        id,
        imageUrl: finalImageUrl,
        slug,
      });
    }

    return result;
  } catch (e) {
    return [];
  }
};

// create a debounced function to avoid too many requests
export const debounce = (func: Function, wait: number) => {
  let timeout: any;
  return function (this: any, ...args: any[]) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
};
