// phong shading
fn phong(r:vec2f, color: vec3f, lp: vec3f, eye: vec3, normal: vec3f) -> vec3f {
    // the diffuse color is the color when ther is light
    let diffuse = color;
    // the ambient color is when there is no light, usually darker
    let ambient = diffuse * .1;

    // the hit point is the actual coordinate on the plane at z = 0
    let hit = vec3(r,0.);
    
    // light intensity
    let li = vec3(.5); 
    // light direction
    let ld = normalize(lp - hit);
    // view direction
    let vd = normalize(eye - hit);

    // the light reflected for specular component
    let re = normalize( reflect(-ld, normal ) );

    let ldif = li * ( diffuse * max(dot(ld,normal),0. ) );
    let lspe = li * ( pow( max( dot(re,vd) ,0.) ,32.) );
    // color is ambient + light intensity * ( diffuse * light diffuse + specular * light specular )
    return ambient +  ldif +  lspe;
}

fn bumpmap(vec2 r, vec3 color, vec3 lp, vec3 normal) -> vec3<f32> {
    // the diffuse color is the color when ther is light
    let diffuse = color;
    // the ambient color is when there is no light, usually darker
    let ambient = diffuse * .1;
    // the position of the eye is just "above" the screen
    // we count away from the screen the z direction
    let eye = vec3(0.,0., 1.);
    // the hit point is the actual coordinate on the plane at z = 0
    let hit = vec3(r,0.);
    
    // light intensity
    let li = vec3(1.5); 
    // light direction
    let ld = normalize(lp - hit);
    // view direction
    let vd = normalize(eye - hit);

    // the light reflected for specular component
    let re = normalize( reflect(-ld, normal ) );

    // color is ambient + light intensity * ( diffuse * light diffuse + specular * light specular )
    return ambient + li * ( diffuse * max(dot(ld,normal),0. ) +  1. * pow( max( dot(re,vd) ,0.) ,32.) );
}
