import { interval, timer, map, Observable, of, animationFrames } from 'npm:rxjs';

const op = map( (x:number) => x * x);

console.log("hello from operators.js")

const operator = (input:Observable<any>): Observable<number> => {

    return input.pipe(op);
}

interval(16).subscribe( (x:any) => console.log(x));
operator(of(2)).subscribe( (x:any) => console.log(x));