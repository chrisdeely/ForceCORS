define(
    {
        type:'array',
        items:{
            type:'object',
            properties:{
                'URL': {type:'string', required: true},
                'headers':{
                    type:'array',
                    required: true,
                    items:{
                        type:'object',
                        properties:{
                            'name':{type:'string', required: true},
                            'value':{type:'string', required: true}
                        }
                    }
                }
            }
        }
    }
);