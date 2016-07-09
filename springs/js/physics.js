/*
 Definition of a Mass object: holds position, velocity, 
 mass and whether the mass is anchored or not.
 */
class Mass {
    constructor(x, y, anchored=false) {
        this.position = [x, y];
        this.velocity = [0, 0];
        this.force = [0., 0.];
        this.mass = 1.;
        this.anchored = false;
    }
}

/*
 Definition of a Spring object: holds a pointer to
 the two masses it connects, its spring constant,
 and its natural length (calculated as the distance
 between the two masses when the spring is constructed).
 */
class Spring {
    constructor(from, to) {
        this.from = from;
        this.to = to;
        this.k = 1.;
        this.anchored = anchored;
        this.naturalLength = this.currentLength();
    }

    currentLength() {
        return distance(this.from.position,
                        this.to.position);
    }
}

/*
 Calculates distance between two 2d vectors.
*/
function distance(v1, v2) {
    return Math.sqrt((v1[0] - v2[0])*(v1[0] - v2[0]) +
                     (v1[1] - v2[1])*(v1[1] - v2[1]));
}

/*
 Holds the state of the in-game universe.
 */
export class Universe {

    // Initializes the state of the universe
    constructor() {
        // No springs
        this.springs = [];
        // One anchored mass at the center
        this.masses = [new Mass(0, 0, true)];
        this.time = 0;
        this.friction = 0;
        // Delta of time corresponding to each frame (TODO: will have to
        // be changed depending on how fast the animation runs)
        this.deltat = 0.01;
    }

    // Add a mass at x & y
    addMass(x, y, anchored=false) {
        mass = new Mass(x, y, anchored);
        this.masses.push(mass);
        this.forces();
        return mass;
    }

    // Remove the mass
    removeMass(mass) {
        this.masses = _.without(this.masses, mass);
        // If the mass is involved in a spring, remove the
        // spring as well
        this.springs = _.filter(this.springs,
                                (spring) => spring.from === mass || spring.to === mass);
        this.forces();
    }

    // Connect two masses with springs
    addSpring(from, to) {
        spring = new Spring(from, to);
        this.springs.push(spring);
        this.forces();
        return spring;
    }

    // Remove the spring
    removeSpring(spring) {
        this.springs = _.without(this.springs, spring);
        this.forces();
    }

    // Calculates the force on each mass for the current state
    // of the universe.
    forces() {
        // zero out all force vectors for all masses
        for (let mass of this.masses) {
            mass.force[0] = mass.force[1] = 0.;
        }

        let f = [0., 0.];

        // loop over all springs
        for (let spring of this.springs) {
            const d = spring.currentLength();
            const nl = spring.naturalLength;

            // Hooke's law: F = -k (x-x0) along the line connecting the masses
            const F = spring.k * (d - nl);

            // project over the unit vectors
            f[0] = - F * (spring.from.position[0] - spring.to.position[0]) / d;
            f[1] = - F * (spring.from.position[1] - spring.to.position[1]) / d;

            // add force to each mass's force vectors
            spring.from.force[0] += f[0];
            spring.from.force[1] += f[1];
            spring.to.force[0] -= f[0];
            spring.to.force[1] -= f[1];            
        }
    }

    evolve() {
        // TODO: code for moving masses
        //
        //
        this.time += this.deltat;
    }
    
}
