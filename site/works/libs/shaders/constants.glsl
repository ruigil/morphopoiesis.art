#define T u_time
#define M u_mouse
#define R u_resolution

#define XY gl_FragCoord.xy
#define UV (XY / R)
#define PIXEL_SIZE (1. / R)
#define EPS ( 1./ (R.x < R.y ? R.x : R.y ) )

#define PI 3.1415926536
#define TAU 6.2831853072
