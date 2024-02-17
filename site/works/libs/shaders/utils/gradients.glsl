vec3 gradient(vec3 brightness, vec3 saturation, vec3 frequency, vec3 offset, float t ) {
    return clamp(brightness + saturation * cos( 6.28318* (frequency * t + offset ) ), 0., 1.);
}

vec3 rainbow(float t) {
    return gradient(vec3(.5), vec3(.5),  vec3(1.,.8,.9), vec3(0.0,0.6,0.3),  t);
}

vec3 sunset(float t) {
    return gradient(vec3(.5), vec3(.5), vec3(1.0), vec3(.1,.2,.5) , t);
}

vec3 earth(float t) {
    return gradient(vec3(.5),vec3(.5),vec3(0.9),vec3(0.47,0.57,0.67), t );
     
}

vec3 sky(float t) {
    return gradient(vec3(.5),vec3(.5),vec3(0.5),vec3(0.5,0.6,0.7), t );
}

vec3 metal(float t) {
    return gradient(vec3(0.5),vec3(0.5),vec3(.8,.9,.9),vec3(0.7,0.57,0.57), t);
}

vec3 nature(float t) {
    return gradient( vec3(0.5), vec3(0.5), vec3(.7,.7,0.1), vec3(0.5,0.62,0.40), t );;
}

vec3 lava(float t) {
    return gradient( vec3(0.5), vec3(0.5), vec3(.5,.5,0.2), vec3(0.65,0.47,0.50), t );
}
vec3 neon(float t) {
    return gradient( vec3(0.5), vec3(0.5), vec3(1.,0.,1.), vec3(0.3,0.5,0.), t );
}

vec3 royal(float t) {
    return gradient( vec3(0.5), vec3(0.5), vec3(.7,.5,.7), vec3(0.35,0.35,0.9), t );
}

vec3 strawberry(float t) {
    return gradient( vec3(0.5), vec3(0.5,7.7,.5), vec3(2.,2.,.0), vec3(0.0,0.5,0.5), t );
}

vec3 stripes(float t) {
    return gradient( vec3(0.5), vec3(5.), vec3(1.,1.,1.0), vec3(0.), t );
}

vec3 vangogh(float t) {
    return gradient( vec3(0.5), vec3(.5), vec3(.5,.5,.5), vec3(0.0,0.0,0.3 ), t );
}