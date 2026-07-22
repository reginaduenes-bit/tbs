/* ---------- SEED: perspectivas, usuarios, objetivos, 35 indicadores ---------- */
export function seed(){
  const P=[
    {id:'fin',nombre:'Finanzas',color:'#0284c7',icono:'$',orden:4,desc:'¿Cómo nos ven los accionistas? Rentabilidad, flujo y estructura financiera.'},
    {id:'com',nombre:'Comercial (Clientes)',color:'#7c3aed',icono:'♥',orden:3,desc:'¿Cómo nos ven los clientes? Participación, satisfacción y crecimiento.'},
    {id:'pro',nombre:'Procesos Internos',color:'#ea580c',icono:'⚙',orden:2,desc:'¿En qué debemos ser excelentes? Cadena de importación, calidad y logística.'},
    {id:'apr',nombre:'Aprendizaje y Crecimiento',color:'#059669',icono:'✦',orden:1,desc:'¿Podemos seguir mejorando? Capital humano, conocimiento y cultura.'}
  ];
  const U=[
    {id:'u1',nombre:'Dirección de Finanzas',ini:'DF'},
    {id:'u2',nombre:'Dirección Comercial',ini:'DC'},
    {id:'u3',nombre:'Dirección de Operaciones',ini:'DO'},
    {id:'u4',nombre:'Recursos Humanos',ini:'RH'},
    {id:'u5',nombre:'Regi (Admin BSC)',ini:'RG'}
  ];
  const O=[
    {id:'o1',pid:'fin',nombre:'Maximizar rentabilidad por unidad'},
    {id:'o2',pid:'fin',nombre:'Optimizar flujo de efectivo y apalancamiento'},
    {id:'o3',pid:'fin',nombre:'Controlar costos de importación'},
    {id:'o4',pid:'com',nombre:'Crecer participación de mercado'},
    {id:'o5',pid:'com',nombre:'Fidelizar y satisfacer al cliente'},
    {id:'o6',pid:'com',nombre:'Vender con pronósticos precisos'},
    {id:'o7',pid:'pro',nombre:'Excelencia logística puerto–CEDIS'},
    {id:'o8',pid:'pro',nombre:'Calidad del producto y garantías'},
    {id:'o9',pid:'apr',nombre:'Desarrollar talento y conocimiento técnico'},
    {id:'o10',pid:'apr',nombre:'Cultura de alto desempeño y retención'}
  ];
  const R=[
    {de:'o9',a:'o8'},{de:'o9',a:'o6'},{de:'o10',a:'o9'},
    {de:'o7',a:'o3'},{de:'o8',a:'o5'},{de:'o7',a:'o5'},
    {de:'o5',a:'o4'},{de:'o6',a:'o2'},{de:'o4',a:'o1'},{de:'o3',a:'o1'},{de:'o5',a:'o1'}
  ];
  // dir: 'up' (mayor=mejor) | 'down' (menor=mejor) | 'monitor' (seguimiento, sin semáforo)
  const mk=(id,nombre,pid,oid,resp,unidad,dir,meta,frec,viz)=>({id,nombre,pid,oid,resp,unidad,dir,meta,frec:frec||'mensual',viz:viz||'auto',verde:95,amarillo:80,peso:1,desc:'',activo:true});
  const I=[
    // FINANZAS
    mk('i01','Tipo de cambio MXN-USD','fin','o3','u1','MXN','monitor',null,'diaria','linea'),
    mk('i02','Costo Contenedor USD','fin','o3','u1','USD','down',3500,'mensual','columnas'),
    mk('i03','Costo Contenedor MXN Eq.','fin','o3','u1','MXN','down',66500,'mensual'),
    mk('i04','Margen bruto por unidad','fin','o1','u1','%','up',18,'mensual','velocimetro'),
    mk('i05','Costo de Inventario','fin','o2','u1','MXN','down',1000000,'mensual'),
    mk('i06','Ciclo de Conversión de Efectivo','fin','o2','u1','días','down',60,'mensual','bala'),
    mk('i07','Ingresos YTD','fin','o1','u1','MXN','up',50000000,'mensual','columnas'),
    mk('i08','Reservas de flujo','fin','o2','u1','MXN','up',5000000,'mensual','area'),
    mk('i09','Costo financiero ponderado global','fin','o2','u1','%','down',12,'mensual'),
    mk('i10','Costo Financiero impactado por camioneta','fin','o2','u1','MXN','down',8000,'mensual'),
    mk('i11','Apalancamiento MXP Eq.','fin','o2','u1','MXN','monitor',null,'mensual','linea'),
    // COMERCIAL
    mk('i12','Market Share','com','o4','u2','%','up',10,'trimestral','velocimetro'),
    mk('i13','Índice de Satisfacción','com','o5','u2','%','up',90,'mensual','dona'),
    mk('i14','Net Promoter Score','com','o5','u2','pts','up',60,'trimestral','velocimetro'),
    mk('i15','Costo Adquisición del Cliente','com','o4','u2','MXN','down',5000,'mensual'),
    mk('i16','Tasa de Reclamaciones','com','o5','u2','%','down',3,'mensual','semaforo'),
    mk('i17','Precisión Pronóstico de venta','com','o6','u2','%','up',90,'mensual','dona'),
    mk('i18','Días de Inventario Comercial Promedio','com','o6','u2','días','down',45,'mensual'),
    mk('i19','Crecimiento de Ventas','com','o4','u2','%','up',15,'mensual','linea'),
    mk('i20','Promedio Mensual Punto de Venta','com','o4','u2','uds','up',25,'mensual','columnas'),
    // PROCESOS INTERNOS
    mk('i21','Fallas','pro','o8','u3','fallas','down',5,'mensual','columnas'),
    mk('i22','Días Contrato - CEDIS','pro','o7','u3','días','down',90,'mensual'),
    mk('i23','Costo de Garantía por unidad','pro','o8','u3','MXN','down',2500,'mensual','bala'),
    mk('i24','Tiempo previas','pro','o7','u3','días','down',5,'mensual'),
    mk('i25','Días de Inventario en planta','pro','o7','u3','días','down',30,'mensual','termometro'),
    mk('i26','Días contenedor en agua','pro','o7','u3','días','down',35,'mensual','columnas'),
    mk('i27','Días entre puerto y CEDIS','pro','o7','u3','días','down',10,'mensual','barrasH'),
    mk('i28','Reportes de calidad','pro','o8','u3','reportes','up',4,'mensual','semaforo'),
    // APRENDIZAJE
    mk('i29','Ingreso por Empleado','apr','o9','u4','MXN','up',250000,'mensual','numero'),
    mk('i30','Índice de satisfacción laboral','apr','o10','u4','%','up',85,'trimestral','velocimetro'),
    mk('i31','Conocimiento del producto','apr','o9','u4','%','up',90,'trimestral','dona'),
    mk('i32','Índice de rotación laboral','apr','o10','u4','%','down',8,'mensual','linea'),
    mk('i33','Horas de capacitación por empleado','apr','o9','u4','hrs','up',8,'mensual','columnas'),
    mk('i34','Conocimiento Mec.','apr','o9','u4','%','up',85,'trimestral','termometro'),
    mk('i35','Tasa de cumplimiento de metas','apr','o10','u4','%','up',90,'mensual','velocimetro')
  ];
  return {empresa:'Mi Empresa Automotriz',perspectivas:P,usuarios:U,objetivos:O,relaciones:R,indicadores:I,mediciones:{}};
}
