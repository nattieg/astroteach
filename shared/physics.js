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
        this.anchored = anchored;
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
        this.k = 50.;
        this.naturalLength = this.currentLength();
    }

    currentLength() {
        return distance(this.from.position,
                        this.to.position);
    }

    energy() {
        const l = this.currentLength() - this.naturalLength;
        return 0.5 * this.k * l * l;
    }
}

class PendulumArm {
    constructor(from, to) {
        if (!from.anchored)
            throw new Error('The mass should be anchored.');
        
        this.from = from;
        this.to = to;
        this.naturaLength = this.currentLength();
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

function add(u, v, out) {
    out[0] = u[0] + v[0];
    out[1] = u[1] + v[1];
}

function sub(u, v, out) {
    out[0] = u[0] - v[0];
    out[1] = u[1] - v[1];
}


function normalize(v) {
    const len = Math.sqrt(dot(v, v));
    v[0] /= len;
    v[1] /= len;
}

/*
 Holds the state of the in-game universe.
 */
export default class Universe {
    // Initializes the state of the universe
    constructor() {
        // No springs
        this.springs = [];
        this.pendulums = [];

        this.masses = [];
        this.time = 0;
        this.friction = 0;
        this.gravity = 0;
        // Delta of time corresponding to each frame 
        this.deltat = 0.005;
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
            throw new Error('Attempting to connect mass with itself');
        
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

    // Connect two masses with a pendulum
    addPendulum(from, to) {
        if (from == to)
            throw new Error('Attempting to connect mass with itself');
        if (!from.anchored) {
            if (!to.anchored)
                throw new Error('One of the two masses must be anchored.');
            [from, to] = [to, from];
        }

        let pendulum = new PendulumArm(from, to);
        this.pendulums.push(pendulum);
        this.forces();

        return pendulum;
    }

    // Remove pendulum
    removePendulum(pendulum) {
        this.pendulums = _.without(this.pendulums, pendulum);
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
            mass.force[1] = -this.friction * mass.velocity[1] - mass.mass * this.gravity;            
        }

        let f = [0., 0.];
        let r = [0., 0.];
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

        for (let pendulum of this.pendulums) {
            const dx = pendulum.to.position[0] - pendulum.from.position[0];
            const dy = pendulum.to.position[1] - pendulum.from.position[1];
            const theta = Math.atan2(dy, dx);
            const mg = pendulum.to.mass * this.gravity;
            
            pendulum.to.force[0] += mg * Math.sin(theta) * Math.cos(theta);
            pendulum.to.force[1] += mg * Math.cos(theta) * Math.cos(theta);
        }
    }

    evolve() {
        for (let mass of this.masses) {
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

        for (let mass of this.masses) {
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
        let K = 0.;
        let U = 0.;
        
        for (let mass of this.masses) {
            K += mass.energy();
        }

        for (let spring of this.springs)
            U += spring.energy();

        return {E: K + U, K, U};
    }

    
}
