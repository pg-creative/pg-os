declare module "react-mermaid2" {
  import { ComponentType } from "react";
  const Mermaid: ComponentType<{ chart: string; config?: object }>;
  export default Mermaid;
}
