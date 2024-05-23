#!/usr/bin/perl
#
sub Usage()
{
    print "This script removes unnecessary items from the environment of a Mizar article.\n";
    print "Usage: \t./clearenv.pl <mizar-article-name>\n";
    print "Note : \t<mizar-article-name> must be a valid Mizar article name (with '.miz' extension).\n\n";
    exit 1;
}

# You may want to change the environment directives to process. See line 121.

my $VERIFIER='verifier -slq';

my $a="$ARGV[0]";
my %env=(vocabularies,'',notations,'',definitions,'',equalities,'',expansions,'',theorems,'',schemes,'',registrations,'',constructors,'',requirements,'');
my %env1;

sub Dumpevd()
{
    open (EVD,"> $a.evd");
    print EVD "environ\n\n";
    foreach my $key (vocabularies,notations,constructors,registrations,requirements,definitions,equalities,expansions,theorems,schemes)
    {
	if ($_[0]{$key}) 
	{
	    my $line = " $key ";
	    my @br = split /,/,$_[0]{$key};
	    $line = $line.$br[0];
	    for ($i=1;$i<=$#br;$i++)
		 {
		     if ((length($line)+3+length($br[$i]))<=79)
		     {
			 $line = $line.", $br[$i]";
		     }
		     else
		     {
			 print EVD "$line,\n";
			 $line="      $br[$i]";
		     }
		 }
	    print EVD "$line;\n";	
	}
    }
    print EVD "\n";
    close EVD;
}

sub Extractcomments()
{
    open(MIZ,"< $a.miz"); 
    open(CMM,"> $a.cmm"); 
    my $e;
    while (<MIZ>)
    {   
	$e=$_;
	my $i=index($e,'begin');
	my $j=index($e,'::');
	if ($i != -1 && ($j == -1 || $j>$i)) {last;}
	if ($j != -1) {print CMM substr($e,$j);}
    }
    print CMM "\n";
    close MIZ;
    close CMM;
}

sub Extractenvironment()
{
    open(MIZ,"< $a.miz"); 
    my $e;
    my $l;
    while (<MIZ>)
    {
	$l=$_;
	$l=~s/::.*//g;
	$e=$e.$l;
    }   
    close MIZ;
    $e =~ s/\s//g;
    $e =~ s/begin.*//g;
    $e =~ s/^.*environ//g;
    my @dirs=split /;/,$e;
    for ($i=0;$i<=$#dirs;$i++)
    {
	my $dir = $dirs[$i];
	$dir =~ /([a-z]+)/;
	my $d = $1;
	$dir =~ /([^a-z]+$)/;
       	$env{$d}=$env{$d}.",$1";
	$env{$d} =~ s/^,//g;	      
    }
}

sub Extractarticle()
{
    open(MIZ,"< $a.miz"); 
    open(TMP,"> $a.tmp"); 
    my $e;
    my $f=0;
    while (<MIZ>)
    {   
	$e=$_;
	my $i=index($e,'begin');
	my $j=index($e,'::');
	if ($i != -1 && ($j == -1 || $j>$i)) {$f=1;}
	if ($f == 1) {print TMP $e;}
    }
    close MIZ;
    close TMP;
}

if ($a eq '') {&Usage;}
if (substr($a,length($a)-4) ne '.miz') {&Usage;}
$a=~s/\.miz$//;
&Extractcomments;
&Extractenvironment;
&Dumpevd(\%env);

#foreach my $key (notations,vocabularies,registrations,definitions,equalities,expansions,theorems,schemes,requirements,constructors)

foreach my $key (notations,registrations,definitions,equalities,expansions,requirements,constructors)
    {
	print "\nProcessing $key\n\n";
	if ($env{$key}) 
	{
	    my $i=0;
	    my @tab=split /,/,$env{$key};
	    while ($i <= $#tab)
	    {
#		print "\ni = $i, env = $env{$key}\n";
		print "\nTrying to remove $tab[$i] from $key ...\n";
#		sleep 5;
		%env1=%env;
		splice @tab,$i,1;
		$env1{$key}=join ',',@tab;
#		print "\nenv = $env1{$key}\n";
		&Dumpevd(\%env1);
		&Extractarticle;
		`cat $a.cmm $a.evd $a.tmp > $a.miz`;
		system "accom -ql $a";
		my $ec=$?>>8;
		if ($ec != 0)
		{
		    $i++;
		    print "\nFailed\n";
		}
		else
		{
		    system "$VERIFIER $a";
		    my $ec=$?>>8;
		    if ($ec != 0)
		    {
			$i++;
			print "\nFailed\n";
		    }
		    else
		    {
			%env=%env1;
			print "\nRemoved successfully\n";
		    }		        
		}
		@tab=split /,/,$env{$key};
	    }
	    &Dumpevd(\%env);
	    &Extractarticle;
	    `cat $a.cmm $a.evd $a.tmp > $a.miz`;
#	    print "\n$key = $env{$key}\n";
	}
    }














