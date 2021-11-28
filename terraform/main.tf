terraform {
	required_providers {
		aws = {
			source = "hashicorp/aws"
			version = "~> 3.27"
		}
	}

  backend "remote" {
    hostname = "app.terraform.io"
    organization = "photoprintstore"

    workspaces {
      name="photoprintstore"
    }
  }

	required_version = ">= 0.14.9"
}

locals {
  prefix = "photoprintstore"
}

provider "aws" {
  profile = "default"
  region = "us-west-2"
}

resource "aws_dynamodb_table" "user_table" {
	name = "${local.prefix}-users"
	billing_mode = "PROVISIONED"
	read_capacity = 1
	write_capacity = 1
	hash_key = "UserID"

	attribute {
		name = "UserID"
		type = "S"
	}

  attribute {
    name = "AccessLevel"
    type = "S"
  }

	global_secondary_index {
		name = "UserIDIndex"
		hash_key = "UserID"
		write_capacity = 1
		read_capacity = 1
		projection_type = "KEYS_ONLY"
	}

	global_secondary_index {
	  name = "AccessLevel"
	  hash_key = "AccessLevel"
	  write_capacity = 1
	  read_capacity = 1
	  projection_type = "KEYS_ONLY"
	}

	tags = {
		Name = "${local.prefix}-users-table"
		Environment = "${local.prefix}"
	}
}

output "dynamodb_table_name" {
  value = resource.aws_dynamodb_table.user_table.name
}

output "dynamodb_table_arn" {
  value = resource.aws_dynamodb_table.user_table.arn
}
