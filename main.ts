import KossuthParser from './kossuthParser';

const shows : Array<string> = [
    'Rádiókabaré',
    'Kabarématiné'
];

new KossuthParser(new Date('2018-10-13'), shows);
