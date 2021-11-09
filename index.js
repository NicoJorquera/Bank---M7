//forma manual
/*const {Pool} = require("pg");
const config ={
    user: "postgres",
    host: "localhost",
    password: "",
    database: "banco",
    port: 5432,
    max: 20,
    idleTimeoutMillis: 5000,
    connectionTimeoutMillis: 2000,
}
let transacciones =[['Transaccion numero 1', '25-08-21', 30000, '1'], ['Transaccion numero 2', '05-09-21', 125000, '2']];
transacciones.forEach((el)=>{
    const pool = new Pool(config);
    pool.connect().then(client =>{
        return client.query("insert into transacciones (descripcion, fecha, monto, cuenta) values ($1,$2,$3,$4) RETURNING *", el)
        .then(res =>{
            client.release()
            console.log(res.rows[0])
        })
        .catch(err =>{
            client.release()
            console.log(err)
        })
    })
})*/

const {Pool} = require("pg");
const Cursor = require("pg-cursor");

const argumentos = process.argv.slice(2);
let movimiento = argumentos[0];
let cuenta1 = argumentos[1];
let cuenta2 = argumentos[2];
let saldo = argumentos[3];

const config = {
    user: "postgres",
    host: "localhost",
    password: "",
    database: "banco",
    post: 5432,
};

const pool = new Pool(config);

/*node index.js nuevaTransaccion 1 2 1000 */
if (movimiento == "nuevaTransaccion"){
    pool.connect(async (error_conexion, client, release) =>{
        if(error_conexion){
            console.log(error_conexion)
       }else{
           try{
            await client.query("BEGIN");
            const sacar = `UPDATE cuentas SET saldo = saldo - ${saldo} WHERE id = ${cuenta1} RETURNING *;`;
            const descuento = await client.query(sacar);

            const abonar = `UPDATE cuentas SET saldo = saldo + ${saldo} WHERE id = ${cuenta2} RETURNING *;`;
            const acreditar = await client.query(abonar);

            const date = new Date();
            const ajuste = `INSERT INTO transacciones (descripcion, fecha, monto, cuenta) VALUES ('Transaccion', '${date.toLocaleDateString()}', ${saldo}, ${cuenta1}) RETURNING *;`;
            const transaccion = await client.query(ajuste);

            console.log("Descuento verificado: ", descuento.rows[0]);
            console.log("Abono realizado de forma exitosa: ", acreditar.rows[0]);
            console.log("Transaccion efectuada correctamente: ", transaccion.rows[0]);

            await client.query("COMMIT");

           }catch(e){
            await client.query("ROLLBACK");
            console.log("Error codigo: " + e.code);
            console.log("Detalle del error: " + e.detalle);
            console.log("Tabla originaria del error encontrado: " + e.table);
            console.log("Restriccion en el campo: " + e.constraint);
           }
           release();
           pool.end();
       }
    })
}

//mientras no tengas que hacer un Create, Update y Delete (CRUD), puedes hacer uso del cursor
/*node index.js resgistros */
if(movimiento == "registros"){
    pool.connect(async (error_conexion, client, release) =>{
        if(error_conexion){
            console.log(error_conexion)
        }else{
            const consulta = new Cursor("SELECT * from transacciones");
            const cursor = client.query(consulta);

            cursor.read(10, (err, rows) =>{
                console.log(rows);
                cursor.close();
                release();
                pool.end();
            })
        }
    })
}

/*node index.js consulta 1 */
if(movimiento == "consulta"){
    pool.connect(async (error_conexion, client, release) =>{
        if(error_conexion){
            console.log(error_conexion)
        }else{
           const consulta = new Cursor(`SELECT * FROM cuentas WHERE id = ${cuenta1}`);
           const cursor = client.query(consulta);
           cursor.read(1, (err, rows) =>{
               console.log(`El saldo correspondiente de ${rows[0].id} es: ${rows[0].saldo}`);
               cursor.close();
               release();
               pool.end();
           }) 
        }
    })
}