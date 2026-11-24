import { ThreeGameContainer } from './containers/ThreeGameContainer';

/**
 * 三维版入口。
 *
 * 与 `@wt/client` 共用 @wt/engine 与 @wt/shared：
 * 规则、命令、终局判定、法术实现一行未改，只替换渲染层与界面皮肤。
 */
export function App() {
  return <ThreeGameContainer />;
}
