// All the following complex operations are defined for the polar form 
// of a complex number. So, they expect a complex number with the 
// format vec2(radius,theta) -> radius*eˆ(i*theta).
// The polar form makes the operations *,/,pow,log very light and simple
// The price to pay is that +,- become more costly :/ 


vec2 toCarte(vec2 z) { return z.x*vec2(cos(z.y),sin(z.y)); }
vec2 toPolar(vec2 z) { return vec2(length(z),atan(z.y,z.x)); }

vec2 zmul(vec2 z1,vec2 z2) { return vec2(z1.x*z2.x,z1.y+z2.y); }
vec2 zdiv(vec2 z1, vec2 z2) { return vec2(z1.x/z2.x,z1.y-z2.y); }
vec2 zlog(vec2 z) { return toPolar(vec2(log(z.x),z.y)); }
vec2 zpow(vec2 z, float n) { return vec2(exp(log(z.x)*n),z.y*n); }
vec2 zpow(float n, vec2 z) { return vec2(exp(log(n)*z.x*cos(z.y)),log(n)*z.x*sin(z.y)); }
vec2 zpow(vec2 z1, vec2 z2) { return zpow(exp(1.),zmul(zlog(z1),z2)); }
vec2 zadd(vec2 z1, vec2 z2) { return toPolar(toCarte(z1) + toCarte(z2)); }
vec2 zsub(vec2 z1, vec2 z2) { return toPolar(toCarte(z1) - toCarte(z2)); }
