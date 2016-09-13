import 'babel-polyfill';
import { makeSyntenyDotPlot } from './main';

// Expose our API, but not anywhere close to anything that might need to be
// tested in node land.
window.makeSyntenyDotPlot = makeSyntenyDotPlot;
