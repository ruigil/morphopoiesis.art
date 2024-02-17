// phong shading
vec3 phong(vec2 r, vec3 color, vec3 lp, vec3 eye, vec3 normal) {
    // the diffuse color is the color when ther is light
    vec3 diffuse = color;
    // the ambient color is when there is no light, usually darker
    vec3 ambient = diffuse * .1;

    // the hit point is the actual coordinate on the plane at z = 0
    vec3 hit = vec3(r,0.);
    
    // light intensity
    vec3 li = vec3(.5); 
    // light direction
    vec3 ld = normalize(lp - hit);
    // view direction
    vec3 vd = normalize(eye - hit);

    // the light reflected for specular component
    vec3 re = normalize( reflect(-ld, normal ) );

    vec3 ldif = li * ( diffuse * max(dot(ld,normal),0. ) );
    vec3 lspe = li * ( pow( max( dot(re,vd) ,0.) ,32.) );
    // color is ambient + light intensity * ( diffuse * light diffuse + specular * light specular )
    return ambient +  ldif +  lspe;
}