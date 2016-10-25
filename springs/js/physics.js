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

class Connection {
    constructor(from, to) {
        this.from = from;
        this.to = to;
        this.naturalLength = this.currentLength();
    }

    currentLength() {
        return distance(this.from.position,
                        this.to.position);
    }

    connectionVector(v = []) {
        v[0] = this.to.position[0]-this.from.position[0];
        v[1] = this.to.position[1]-this.from.position[1];
        return v;
    }

    connectionUnitVector(v = []) {
        v[0] = (this.to.position[0]-this.from.position[0])/this.naturalLength;
        v[1] = (this.to.position[0]-this.from.position[0])/this.naturalLength;
        return v;
    }
}

/*
 Definition of a Spring object: holds a pointer to
 the two masses it connects, its spring constant,
 and its natural length (calculated as the distance
 between the two masses when the spring is constructed).
 */
class Spring extends Connection {
    constructor(from, to) {
        super(from, to);
        this.k = 50.;
    }

    energy() {
        const l = this.currentLength() - this.naturalLength;
        return 0.5 * this.k * l * l;
    }
}

class PendulumArm extends Connection {
    constructor(from, to) {
        super(from, to);
        if (!from.anchored)
            throw new Error('The first mass should be anchored.');
        to.constraint = this;
    }

    energy() {
        // TODO: Implement
        return 0;
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

function norm(v) {
    return Math.sqrt(dot(v, v));
}

function norm2(v) {
    return dot(v, v);
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
        this.connections = [];
        this.masses = [];
        this.time = 0;
        this.friction = 0.;
        this.gravity = 0;
        // Delta of time corresponding to each frame 
        this.deltat = 0.03;
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
        this.connections = _.filter(this.connections,
                                    (con) => con.from === mass || con.to === mass);
        this.forces();
    }

    // Connect two masses with springs
    addSpring(from, to) {
        if (from === to)
            throw new Error('Attempting to connect mass with itself');
        
        let spring = new Spring(from, to);
        this.connections.push(spring);
        this.forces();
        return spring;
    }

    // Remove the spring
    removeConnection(con) {
        this.connections = _.without(this.connections, con);
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
        this.connections.push(pendulum);
        this.forces();

        return pendulum;
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
        for (let con of this.connections) {
            if (con instanceof Spring) {
                const spring = con;
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
            } else if (con instanceof PendulumArm) {

            }
        }
    }

    evolve() {
        for (let mass of this.masses) {
            // We need the current force on each mass at time i. Since we need
            // The force at the i+1 step as well, save the current force in a separate
            // array.
            if (mass.anchored)
                continue;

            if (! mass.constraint) {
                mass.force0 = mass.force0 || [];
                mass.force0[0] = mass.force[0];
                mass.force0[1] = mass.force[1];

                // x_i+1 = x_i + v_i * deltat + 0.5 * a_i * deltat^2
                mass.position[0] += mass.velocity[0] * this.deltat +
                    0.5 * mass.force0[0] / mass.mass * this.deltat * this.deltat;
                mass.position[1] += mass.velocity[1] * this.deltat +
                    0.5 * mass.force0[1] / mass.mass * this.deltat * this.deltat;
            } else {
                if (mass.constraint instanceof PendulumArm) {
                    const L = mass.constraint.naturalLength;
                    
                    if (! mass.theta) {
                        const r2theta2 = norm2(mass.velocity) - dot(mass.velocity, mass.constraint.connectionUnitVector());
                        mass.theta = Math.atan2(mass.position[0],
                                                -mass.position[1]);
                        mass.theta_dot = Math.sqrt(Math.max(r2theta2, 0))/mass.constraint.naturalLength;
                    }

                    mass.theta0 = mass.theta;
                    mass.theta_dot0 = mass.theta_dot;
                    const acc0 = -norm(mass.force)/L * Math.sin(mass.theta0);
                    
                    mass.theta = mass.theta0 + mass.theta_dot0 * this.deltat +
                        0.5 * acc0 / mass.mass * this.deltat * this.deltat;

                    mass.position[0] = L * Math.sin(mass.theta);
                    mass.position[1] = -L * Math.cos(mass.theta);
                }
            }
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

        for (let con of this.connections)
            U += con.energy();

        return {E: K + U, K, U};
    }

    
}
