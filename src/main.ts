import Sketch from "./pixiJsSketch";
import "./style.css";
import data from "./MOCK_DATA.json";

const app = document.getElementById("app")!;

const transformedData = data
  .map((item) => ({
    ...item,
    id: item.id.toString(),
  }))
  .slice(0, 16);

const handleClick = (imgSlug: string) => {
  console.log(imgSlug);
};

const sketch = new Sketch(app, transformedData!, handleClick);
console.log(sketch);
