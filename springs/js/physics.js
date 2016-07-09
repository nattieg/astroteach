import _ from 'lodash';

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

    energy() {
        return 0.5 * this.mass * dot(this.velocity, this.velocity);
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
        this.naturalLength = this.currentLength();
    }

    currentLength() {
        return distance(this.from.position,
                        this.to.position);
    }

    energy() {
        const l = this.currentLength();
        return this.k * l * l;
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
 Calculates dot product of two 2d vector.
 */
function dot(u, v) {
    return u[0] * v[0] + u[1] * v[1];
}

/*
 Holds the state of the in-game universe.
 */
export default class Universe {
    // Initializes the state of the universe
    constructor() {
        // No springs
        this.springs = [];
        // One anchored mass at the center
        this.masses = [];
        this.time = 0;
        this.friction = 0;
        // Delta of time corresponding to each frame (TODO: will have to
        // be changed depending on how fast the animation runs)
        this.deltat = 0.01;
    }

    // Add a mass at x & y
    addMass(x, y, anchored=false) {
        let mass = new Mass(x, y, anchored);
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
        if (from === to)
            throw 'Attempting to connect mass with itself';
        
        let spring = new Spring(from, to);
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
        // Initialize all force vectors
        for (let mass of this.masses) {
            // Frictional force; if friction == 0, this will just
            // zero out the vectors.
            mass.force[0] = -this.friction * mass.velocity[0];
            mass.force[1] = -this.friction * mass.velocity[1];            
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
        for (let mass in this.masses) {
            // We need the current force on each mass at time i. Since we need
            // The force at the i+1 step as well, save the current force in a separate
            // array.
            if (mass.anchored)
                continue;
            
            mass.force0 = mass.force0 || [];
            mass.force0[0] = mass.force[0];
            mass.force0[1] = mass.force[1];

            // x_i+1 = x_i + v_i * deltat + 0.5 * a_i * deltat^2
            mass.position[0] += mass.velocity[0] * this.deltat +
                0.5 * mass.force0[0] / mass.mass * this.deltat * this.deltat;
            mass.position[1] += mass.velocity[1] * this.deltat +
                0.5 * mass.force0[1] / mass.mass * this.deltat * this.deltat;            
        }

        // Recalculate forces at the new positions
        this.forces();

        for (let mass in this.masses) {
            if (mass.anchored)
                continue;

            // v_i+1 = v_i + 0.5 * (a_i + a_i+1) * deltat
            mass.velocity[0] += 0.5 * (mass.force0[0] + mass.force[0]) * this.deltat;
            mass.velocity[1] += 0.5 * (mass.force0[1] + mass.force[1]) * this.deltat;
        }

        this.time += this.deltat;
    }

    // Calculate total energy of the system (to monitor
    // performance of integrator)
    energy() {
        let E = 0.;

        for (let mass of this.masses)
            E += mass.energy();

        for (let spring of this.springs)
            E += spring.energy();

        return E;
    }
}
