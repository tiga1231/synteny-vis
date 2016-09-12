// Expose our API, but not anywhere close to anything that might need to be
// tested in node land.
import { makeSyntenyDotPlot } from './main';
window.makeSyntenyDotPlot = makeSyntenyDotPlot;
