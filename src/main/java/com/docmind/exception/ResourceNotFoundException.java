package com.docmind.exception;

public class ResourceNotFoundException extends  RuntimeException{

    public ResourceNotFoundException(){
        super("Resource you are looking not found !");
    }

    public ResourceNotFoundException(String message){
        super(message);
    }

    public ResourceNotFoundException(String m,Throwable ex){
        super(m,ex);
    }
}
